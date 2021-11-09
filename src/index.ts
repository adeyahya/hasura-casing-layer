import {
  RenameTypes,
  RenameRootTypes,
  RenameRootFields,
  RenameObjectFields,
  RenameInterfaceFields,
  RenameInputObjectFields,
  TransformEnumValues,
  wrapSchema,
  introspectSchema,
} from "@graphql-tools/wrap";
import { GraphQLFieldConfig, print } from "graphql";
import { isUpperCase } from "is-upper-case";
import { fetch } from "cross-fetch";
import camelCase from "lodash/camelCase";

export type OperationKindType =
  | "types"
  | "rootTypes"
  | "rootFields"
  | "objectFields"
  | "interfaceFields"
  | "inputObjectFields"
  | "enumValues"
  | "fieldConfig";

export interface IBuildSchemaOptions {
  uri: string;
  hasuraAdminSecret: string;
  headers?: Record<string, string>;
  replacer: (target: string, type: OperationKindType) => string;
}

export const transformRemoteSchema = async (config: IBuildSchemaOptions) => {
  const additionalHeaders = config.headers ?? {};

  function changeCase(target: string, type: OperationKindType) {
    if (config.replacer) {
      return config.replacer(target, type);
    }

    // Checking regex for preserving prefix underscore(s), which Hasura also generates.
    return `${target.match(/^_+/g) || ""}${camelCase(target)}`;
  }

  const executor = async ({ document, variables, context }: any) => {
    const reqHeaders = context?.headers ?? {};
    const query = print(document);
    const fetchResult = await fetch(config.uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...reqHeaders,
      },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };

  const instrospectionExecutor = async ({ document, variables }: any) => {
    const query = print(document);
    const fetchResult = await fetch(config.uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": config.hasuraAdminSecret,
        ...additionalHeaders,
      },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };

  function transformFieldConfig(fieldConfig: GraphQLFieldConfig<any, any>) {
    const newArgs: { [key: string]: any } = {};
    for (const argName in fieldConfig.args) {
      if (Object.prototype.hasOwnProperty.call(fieldConfig.args, argName)) {
        newArgs[changeCase(argName, "fieldConfig")] = fieldConfig.args[argName];
      }
    }
    fieldConfig.args = newArgs;
  }

  return wrapSchema({
    schema: await introspectSchema(instrospectionExecutor),
    executor,
    transforms: [
      new RenameTypes((name) => changeCase(name, "types")),
      new RenameRootTypes((name) => {
        switch (name) {
          case "query_root":
            return "Query";
          case "mutation_root":
            return "Mutation";
          case "subscription_root":
            return "Subscription";
          default:
            return name;
        }
      }),
      new RenameRootFields((_, fieldName, fieldConfig) => {
        transformFieldConfig(fieldConfig);
        return changeCase(fieldName, "rootFields");
      }),
      new RenameObjectFields((_, fieldName, fieldConfig) => {
        transformFieldConfig(fieldConfig);
        return changeCase(fieldName, "objectFields");
      }),
      new RenameInterfaceFields((_, fieldName, fieldConfig) => {
        transformFieldConfig(fieldConfig);
        return changeCase(fieldName, "interfaceFields");
      }),
      new RenameInputObjectFields((_, fieldName) => {
        return changeCase(fieldName, "inputObjectFields");
      }),
      // @ts-ignore // Type issue. REF: https://github.com/ardatan/graphql-tools/issues/2994
      new TransformEnumValues((typeName, enumValue, enumValueConfig) => {
        // According to the official specification, all-caps case is recommended for enums values.
        // REF: http://spec.graphql.org/June2018/#EnumValue
        // However, hasura generates enums that represents columns
        // (ex: `user_update_column`), whose values are same as columns.
        // Thus, hereby leaving an exception.
        // If enum Value is already upper case, leave it as is.
        // If not, then change it to camel case (as column names are already modified
        // to camel case from `RenameObjectFields` above)
        const newEnumValue = isUpperCase(enumValue)
          ? enumValue
          : changeCase(enumValue, "enumValues");
        return [newEnumValue, enumValueConfig];
      }),
    ],
  });
};

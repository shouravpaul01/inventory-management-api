import { Prisma } from "@prisma/client";

type PrismaOperator =
  | "equals"
  | "not"
  | "in"
  | "notIn"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "contains"
  | "startsWith"
  | "endsWith";

type QueryFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "string[]"
  | "number[]"
  | "boolean[]";

type FieldConfig = {
  type: QueryFieldType;

  /**
   * Operators explicitly allowed for this field.
   *
   * Example:
   * {
   *   name: {
   *     type: "string",
   *     operators: ["equals", "contains", "startsWith"]
   *   }
   * }
   */
  operators?: readonly PrismaOperator[];

  /**
   * Whether this field can be searched using search().
   */
  searchable?: boolean;

  /**
   * Whether this field can be used in sorting.
   */
  sortable?: boolean;

  /**
   * Whether this field can be returned through fields().
   */
  selectable?: boolean;

  /**
   * Whether this field can be used in filtering.
   */
  filterable?: boolean;
};

type QueryBuilderOptions = {
  /**
   * Explicit field configuration.
   *
   * Recommended for public APIs.
   */
  fields?: Record<string, FieldConfig>;

  /**
   * Maximum number of records per request.
   */
  maxLimit?: number;

  /**
   * Default number of records per request.
   */
  defaultLimit?: number;

  /**
   * Whether offset pagination is enabled.
   */
  enableOffsetPagination?: boolean;

  /**
   * Whether cursor pagination is enabled.
   */
  enableCursorPagination?: boolean;

  /**
   * Maximum number of sort fields.
   */
  maxSortFields?: number;

  /**
   * Maximum number of selected fields.
   */
  maxSelectFields?: number;

  /**
   * Maximum number of OR search fields.
   */
  maxSearchFields?: number;
};

const DEFAULT_EXCLUDED_FIELDS = new Set([
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
  "cursor",
]);

const DEFAULT_MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_SORT_FIELDS = 3;
const DEFAULT_MAX_SELECT_FIELDS = 30;
const DEFAULT_MAX_SEARCH_FIELDS = 10;

const ALL_OPERATORS: ReadonlySet<PrismaOperator> = new Set([
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "endsWith",
]);

const STRING_OPERATORS: readonly PrismaOperator[] = [
  "equals",
  "not",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "notIn",
];

const NUMBER_OPERATORS: readonly PrismaOperator[] = [
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
];

const DATE_OPERATORS: readonly PrismaOperator[] = [
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
];

const BOOLEAN_OPERATORS: readonly PrismaOperator[] = [
  "equals",
  "not",
];

const ARRAY_OPERATORS: readonly PrismaOperator[] = [
  "equals",
  "not",
  "in",
  "notIn",
];

const DEFAULT_OPERATORS_BY_TYPE: Record<
  QueryFieldType,
  readonly PrismaOperator[]
> = {
  string: STRING_OPERATORS,
  number: NUMBER_OPERATORS,
  boolean: BOOLEAN_OPERATORS,
  date: DATE_OPERATORS,
  "string[]": ARRAY_OPERATORS,
  "number[]": ARRAY_OPERATORS,
  "boolean[]": ARRAY_OPERATORS,
};

type FindManyArgs = Prisma.UserFindManyArgs;

type ModelDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrismaOperator(value: string): value is PrismaOperator {
  return ALL_OPERATORS.has(value as PrismaOperator);
}

/**
 * Safely converts a query-string value into its expected type.
 *
 * IMPORTANT:
 * We don't guess the type anymore.
 * The field configuration decides the expected type.
 */
function parseValue(
  rawValue: string,
  type: QueryFieldType
): unknown {
  switch (type) {
    case "string":
      return rawValue;

    case "number": {
      const value = Number(rawValue);

      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number value: "${rawValue}"`);
      }

      return value;
    }

    case "boolean": {
      if (rawValue === "true") return true;
      if (rawValue === "false") return false;

      throw new Error(`Invalid boolean value: "${rawValue}"`);
    }

    case "date": {
      const date = new Date(rawValue);

      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date value: "${rawValue}"`);
      }

      return date;
    }

    case "string[]":
      return rawValue.split(",").map((value) => value.trim());

    case "number[]":
      return rawValue.split(",").map((value) => {
        const parsed = Number(value.trim());

        if (!Number.isFinite(parsed)) {
          throw new Error(`Invalid number value: "${value}"`);
        }

        return parsed;
      });

    case "boolean[]":
      return rawValue.split(",").map((value) => {
        const trimmed = value.trim();

        if (trimmed === "true") return true;
        if (trimmed === "false") return false;

        throw new Error(`Invalid boolean value: "${value}"`);
      });

    default:
      return rawValue;
  }
}

/**
 * Parses comma-separated values for `in` / `notIn`.
 */
function parseOperatorValue(
  rawValue: string,
  operator: PrismaOperator,
  type: QueryFieldType
): unknown {
  if (operator !== "in" && operator !== "notIn") {
    return parseValue(rawValue, type);
  }

  const values = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`${operator} requires at least one value`);
  }

  /**
   * For scalar fields:
   *
   * ?status[in]=ACTIVE,PENDING
   * ?age[in]=10,20,30
   */
  if (
    type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "date"
  ) {
    return values.map((value) => parseValue(value, type));
  }

  /**
   * Array fields are not treated as scalar IN values.
   * They should normally be handled through rawFilter/service logic.
   */
  throw new Error(
    `${operator} is not supported for array field type "${type}"`
  );
}

function getDefaultOperators(type: QueryFieldType) {
  return DEFAULT_OPERATORS_BY_TYPE[type];
}

function getFieldConfig(
  field: string,
  fields?: Record<string, FieldConfig>
): FieldConfig | undefined {
  if (!fields) return undefined;

  /**
   * Exact field first.
   */
  if (fields[field]) {
    return fields[field];
  }

  /**
   * Support one-level nested relation fields:
   *
   * author.name
   * category.name
   */
  const parts = field.split(".");

  if (parts.length !== 2) {
    return undefined;
  }

  const [, nestedField] = parts;

  /**
   * Otherwise, we intentionally DON'T automatically trust
   * the nested field from the parent relation.
   */
  if (fields[nestedField]) {
    return fields[nestedField];
  }

  return undefined;
}

class QueryBuilder<T = unknown> {
  private readonly model: ModelDelegate;

  private readonly query: Record<string, unknown>;

  private readonly options: Required<
    Pick<
      QueryBuilderOptions,
      | "maxLimit"
      | "defaultLimit"
      | "enableOffsetPagination"
      | "enableCursorPagination"
      | "maxSortFields"
      | "maxSelectFields"
      | "maxSearchFields"
    >
  > &
    Omit<
      QueryBuilderOptions,
      | "maxLimit"
      | "defaultLimit"
      | "enableOffsetPagination"
      | "enableCursorPagination"
      | "maxSortFields"
      | "maxSelectFields"
      | "maxSearchFields"
    >;

  private prismaQuery: Record<string, unknown> = {};

  /**
   * All filters are accumulated here.
   *
   * Example:
   *
   * ?status=ACTIVE&age[gte]=18
   *
   * becomes:
   *
   * {
   *   AND: [
   *     { status: "ACTIVE" },
   *     { age: { gte: 18 } }
   *   ]
   * }
   */
  private readonly whereConditions: Record<string, unknown>[] = [];

  constructor(
    model: ModelDelegate,
    query: Record<string, unknown>,
    options: QueryBuilderOptions = {}
  ) {
    this.model = model;
    this.query = query;

    this.options = {
      maxLimit: options.maxLimit ?? DEFAULT_MAX_LIMIT,
      defaultLimit: options.defaultLimit ?? DEFAULT_LIMIT,
      enableOffsetPagination:
        options.enableOffsetPagination ?? true,
      enableCursorPagination:
        options.enableCursorPagination ?? true,
      maxSortFields:
        options.maxSortFields ?? DEFAULT_MAX_SORT_FIELDS,
      maxSelectFields:
        options.maxSelectFields ?? DEFAULT_MAX_SELECT_FIELDS,
      maxSearchFields:
        options.maxSearchFields ?? DEFAULT_MAX_SEARCH_FIELDS,
      fields: options.fields,
    };
  }

  /**
   * Check whether a field is configured.
   */
  private getConfig(field: string): FieldConfig {
    const config = getFieldConfig(field, this.options.fields);

    if (!config) {
      throw new Error(`Field "${field}" is not allowed`);
    }

    return config;
  }

  /**
   * Verify that field can be used for filtering.
   */
  private assertFilterable(field: string): FieldConfig {
    const config = this.getConfig(field);

    if (config.filterable === false) {
      throw new Error(`Filtering by "${field}" is not allowed`);
    }

    return config;
  }

  /**
   * Verify operator is valid for the field's type.
   */
  private assertOperator(
    operator: string,
    config: FieldConfig
  ): asserts operator is PrismaOperator {
    if (!isPrismaOperator(operator)) {
      throw new Error(`Unsupported operator "${operator}"`);
    }

    const allowedOperators =
      config.operators ?? getDefaultOperators(config.type);

    if (!allowedOperators.includes(operator)) {
      throw new Error(
        `Operator "${operator}" is not allowed for field type "${config.type}"`
      );
    }
  }

  /**
   * Search.
   *
   * Example:
   *
   * ?searchTerm=shourav
   *
   * Search fields must be explicitly marked:
   *
   * {
   *   name: {
   *     type: "string",
   *     searchable: true
   *   }
   * }
   */
  search(searchableFields: string[]) {
    const rawSearchTerm = this.query.searchTerm;

    if (
      typeof rawSearchTerm !== "string" ||
      rawSearchTerm.trim() === ""
    ) {
      return this;
    }

    const searchTerm = rawSearchTerm.trim();

    /**
     * Prevent unnecessarily huge OR queries.
     */
    const fields = searchableFields
      .filter(Boolean)
      .slice(0, this.options.maxSearchFields)
      .filter((field) => {
        try {
          const config = this.getConfig(field);

          return (
            config.searchable === true &&
            config.type === "string"
          );
        } catch {
          return false;
        }
      });

    if (fields.length === 0) {
      return this;
    }

    const orConditions = fields.map((field) => {
      if (field.includes(".")) {
        const parts = field.split(".");

        if (parts.length !== 2) {
          return {};
        }

        const [relation, nestedField] = parts;

        return {
          [relation]: {
            is: {
              [nestedField]: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        };
      }

      return {
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      };
    });

    this.whereConditions.push({
      OR: orConditions,
    });

    return this;
  }

  /**
   * Filters from URL query params.
   *
   * Examples:
   *
   * ?status=ACTIVE
   *
   * ?age[gte]=18
   *
   * ?status[in]=ACTIVE,PENDING
   *
   * ?createdAt[lte]=2026-01-01
   */
  filter() {
    const queryObj = {
      ...this.query,
    };

    for (const field of DEFAULT_EXCLUDED_FIELDS) {
      delete queryObj[field];
    }

    for (const [key, rawValue] of Object.entries(queryObj)) {
      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      /**
       * Express query params can technically contain arrays.
       * This builder intentionally accepts scalar values only.
       */
      if (Array.isArray(rawValue)) {
        continue;
      }

      const bracketMatch = key.match(
        /^([^[]+)\[([^\]]+)\]$/
      );

      let field = key;
      let operator: string | null = null;

      if (bracketMatch) {
        field = bracketMatch[1];
        operator = bracketMatch[2];
      }

      const config = this.assertFilterable(field);

      const rawString = String(rawValue).trim();

      if (rawString === "") {
        continue;
      }

      /**
       * Normal filter:
       *
       * ?status=ACTIVE
       */
      if (!operator) {
        this.whereConditions.push({
          [field]: parseValue(rawString, config.type),
        });

        continue;
      }

      /**
       * Operator filter:
       *
       * ?age[gte]=18
       */
      this.assertOperator(operator, config);

      const parsedValue = parseOperatorValue(
        rawString,
        operator,
        config.type
      );

      this.whereConditions.push({
        [field]: {
          [operator]: parsedValue,
        },
      });
    }

    return this;
  }

  /**
   * Trusted server-side filters.
   *
   * This bypasses public query validation intentionally.
   *
   * Example:
   *
   * .rawFilter({
   *   userId: currentUser.id
   * })
   */
  rawFilter(filters: Record<string, unknown>) {
    if (!isRecord(filters)) {
      return this;
    }

    if (Object.keys(filters).length > 0) {
      this.whereConditions.push(filters);
    }

    return this;
  }

  /**
   * Sorting.
   *
   * Example:
   *
   * ?sort=-createdAt,name
   *
   * Only fields configured with:
   *
   * sortable: true
   *
   * are accepted.
   */
  sort() {
    const rawSort =
      typeof this.query.sort === "string"
        ? this.query.sort
        : "-createdAt";

    const requestedFields = rawSort
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
      .slice(0, this.options.maxSortFields);

    const orderBy: Record<string, unknown>[] = [];

    for (const rawField of requestedFields) {
      const desc = rawField.startsWith("-");

      const cleanField = desc
        ? rawField.slice(1)
        : rawField;

      if (!cleanField) {
        continue;
      }

      let config: FieldConfig;

      try {
        config = this.getConfig(cleanField);
      } catch {
        continue;
      }

      if (config.sortable !== true) {
        continue;
      }

      const direction = desc ? "desc" : "asc";

      /**
       * Support one-level nested relation sorting.
       */
      const parts = cleanField.split(".");

      if (parts.length === 2) {
        const [relation, nestedField] = parts;

        orderBy.push({
          [relation]: {
            [nestedField]: direction,
          },
        });

        continue;
      }

      orderBy.push({
        [cleanField]: direction,
      });
    }

    /**
     * If all requested sort fields are invalid,
     * fallback to createdAt only when it is explicitly sortable.
     */
    if (orderBy.length === 0) {
      const createdAtConfig = this.options.fields?.createdAt;

      if (createdAtConfig?.sortable === true) {
        orderBy.push({
          createdAt: "desc",
        });
      }
    }

    if (orderBy.length > 0) {
      this.prismaQuery.orderBy = orderBy;
    }

    return this;
  }

  /**
   * Offset pagination.
   *
   * ?page=2&limit=20
   */
  paginate() {
    if (!this.options.enableOffsetPagination) {
      return this;
    }

    const pageValue = Number(this.query.page);
    const limitValue = Number(this.query.limit);

    const page =
      Number.isInteger(pageValue) && pageValue > 0
        ? pageValue
        : 1;

    const requestedLimit =
      Number.isInteger(limitValue) && limitValue > 0
        ? limitValue
        : this.options.defaultLimit;

    const limit = Math.min(
      Math.max(1, requestedLimit),
      this.options.maxLimit
    );

    const skip = (page - 1) * limit;

    this.prismaQuery.skip = skip;
    this.prismaQuery.take = limit;

    return this;
  }

  /**
   * Cursor pagination.
   *
   * Requires a Prisma cursor-compatible unique field.
   *
   * Example:
   *
   * ?cursor=665f123...
   */
  cursorPaginate(cursorField = "id") {
    if (!this.options.enableCursorPagination) {
      return this;
    }

    const cursor =
      typeof this.query.cursor === "string"
        ? this.query.cursor.trim()
        : "";

    if (!cursor) {
      return this;
    }

    /**
     * Cursor field must be explicitly configured.
     */
    const config = this.options.fields?.[cursorField];

    if (!config) {
      throw new Error(
        `Cursor field "${cursorField}" is not configured`
      );
    }

    const limitValue = Number(this.query.limit);

    const requestedLimit =
      Number.isInteger(limitValue) && limitValue > 0
        ? limitValue
        : this.options.defaultLimit;

    const limit = Math.min(
      Math.max(1, requestedLimit),
      this.options.maxLimit
    );

    this.prismaQuery.cursor = {
      [cursorField]: cursor,
    };

    /**
     * Skip the cursor record itself.
     */
    this.prismaQuery.skip = 1;
    this.prismaQuery.take = limit;

    return this;
  }

  /**
   * Select fields.
   *
   * Example:
   *
   * ?fields=id,name,email
   *
   * Only fields configured with:
   *
   * selectable: true
   *
   * are accepted.
   */
  fields() {
    const rawFields = this.query.fields;

    if (typeof rawFields !== "string") {
      return this;
    }

    const requestedFields = rawFields
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
      .slice(0, this.options.maxSelectFields);

    if (requestedFields.length === 0) {
      return this;
    }

    const select: Record<string, boolean> = {};

    for (const field of requestedFields) {
      const config = this.options.fields?.[field];

      if (!config) {
        continue;
      }

      if (config.selectable !== true) {
        continue;
      }

      select[field] = true;
    }

    if (Object.keys(select).length === 0) {
      return this;
    }

    if (this.prismaQuery.include) {
      throw new Error(
        "QueryBuilder: `fields` cannot be used together with `include`."
      );
    }

    this.prismaQuery.select = select;

    return this;
  }

  /**
   * Include related models.
   *
   * IMPORTANT:
   * Include relations should NOT be blindly exposed to public query params.
   *
   * The controller/service should explicitly decide which relations
   * are allowed.
   */
  include(
    includableFields: Record<
      string,
      boolean | Record<string, unknown>
    >
  ) {
    if (this.prismaQuery.select) {
      throw new Error(
        "QueryBuilder: `include` cannot be used together with `fields`."
      );
    }

    this.prismaQuery.include = {
      ...(isRecord(this.prismaQuery.include)
        ? this.prismaQuery.include
        : {}),
      ...includableFields,
    };

    return this;
  }

  /**
   * Builds final WHERE condition.
   */
  private buildWhere(): Record<string, unknown> | undefined {
    if (this.whereConditions.length === 0) {
      return undefined;
    }

    if (this.whereConditions.length === 1) {
      return this.whereConditions[0];
    }

    return {
      AND: this.whereConditions,
    };
  }

  /**
   * Builds final Prisma query.
   */
  private getFinalQuery(): Record<string, unknown> {
    const where = this.buildWhere();

    return {
      ...this.prismaQuery,
      ...(where ? { where } : {}),
    };
  }

  /**
   * Preview query without executing it.
   */
  debugQuery(): Record<string, unknown> {
    return this.getFinalQuery();
  }

  /**
   * Execute findMany.
   */
  async execute(): Promise<unknown[]> {
    return this.model.findMany(
      this.getFinalQuery()
    );
  }

  /**
   * Count total records.
   */
  async countTotal() {
    const where = this.buildWhere();

    const total = await this.model.count({
      ...(where ? { where } : {}),
    });

    const pageValue = Number(this.query.page);
    const limitValue = Number(this.query.limit);

    const page =
      Number.isInteger(pageValue) && pageValue > 0
        ? pageValue
        : 1;

    const requestedLimit =
      Number.isInteger(limitValue) && limitValue > 0
        ? limitValue
        : this.options.defaultLimit;

    const limit = Math.min(
      Math.max(1, requestedLimit),
      this.options.maxLimit
    );

    const totalPage =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPage,
      hasNextPage: page < totalPage,
      hasPreviousPage: page > 1,
    };
  }
}

export default QueryBuilder;
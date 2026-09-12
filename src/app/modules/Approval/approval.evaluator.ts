/**
 * Safe Condition Evaluator for Approval Policies.
 *
 * Evaluates configured JSON rules against payload contexts without executing
 * arbitrary MongoDB queries or code.
 */

export interface IConditionRule {
  field: string;
  operator: string;
  value: any;
}

export interface IConditionGroup {
  operator?: "AND" | "OR";
  conditions?: (IConditionRule | IConditionGroup)[];
  rules?: (IConditionRule | IConditionGroup)[];
}

const ALLOWED_OPERATORS = new Set([
  "==", "!=", ">", ">=", "<", "<=", "in", "not_in",
  "eq", "neq", "gt", "gte", "lt", "lte",
  "EQUALS", "NOT_EQUALS", "GT", "GTE", "LT", "LTE", "IN", "NOT_IN", "CONTAINS",
]);

export const evaluateRule = (rule: IConditionRule, context: Record<string, any>): boolean => {
  if (!rule || typeof rule.field !== "string" || !ALLOWED_OPERATORS.has(rule.operator)) {
    return false;
  }

  const contextValue = context[rule.field];
  const targetValue = rule.value;
  const op = rule.operator.toUpperCase();

  switch (op) {
    case "==":
    case "EQ":
    case "EQUALS":
      return String(contextValue) === String(targetValue);

    case "!=":
    case "NEQ":
    case "NOT_EQUALS":
      return String(contextValue) !== String(targetValue);

    case ">":
    case "GT":
      return Number(contextValue) > Number(targetValue);

    case ">=":
    case "GTE":
      return Number(contextValue) >= Number(targetValue);

    case "<":
    case "LT":
      return Number(contextValue) < Number(targetValue);

    case "<=":
    case "LTE":
      return Number(contextValue) <= Number(targetValue);

    case "IN":
      if (Array.isArray(targetValue)) {
        return targetValue.includes(contextValue);
      }
      return false;

    case "NOT_IN":
      if (Array.isArray(targetValue)) {
        return !targetValue.includes(contextValue);
      }
      return true;

    case "CONTAINS":
      if (typeof contextValue === "string") {
        return contextValue.toLowerCase().includes(String(targetValue).toLowerCase());
      }
      return false;

    default:
      return false;
  }
};

export const evaluateCondition = (
  condition: any,
  context: Record<string, any> = {}
): boolean => {
  if (!condition) {
    // If no condition specified, the rule applies unconditionally
    return true;
  }

  // Single rule
  if (condition.field && condition.operator) {
    return evaluateRule(condition as IConditionRule, context);
  }

  // Group of rules (AND / OR)
  const subRules = condition.conditions || condition.rules;
  if (Array.isArray(subRules)) {
    const operator = (condition.operator || "AND").toUpperCase();

    if (operator === "OR") {
      return subRules.some((subRule) => evaluateCondition(subRule, context));
    } else {
      // Default to AND
      return subRules.every((subRule) => evaluateCondition(subRule, context));
    }
  }

  return true;
};

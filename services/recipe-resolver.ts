/**
 * Shared recursive recipe resolver.
 *
 * Given a product's direct ingredient links and the full ingredient composition
 * graph, this utility expands each ingredient into its leaf/raw ingredient
 * consumptions by recursively traversing ingredient_compositions edges.
 *
 * Processed ingredients are treated as virtual nodes: only leaf ingredients
 * (those with no children in the composition graph) are returned for deduction.
 * This avoids double-decrement of stock for processed intermediates.
 *
 * Cycle detection is included to prevent infinite recursion on malformed data.
 */

export type RecipeEdge = {
  ingredientId: string;
  quantityUsed: number;
};

export type CompositionEdge = {
  parentIngredientId: string;
  childIngredientId: string;
  quantityNeeded: number;
};

export type LeafConsumption = {
  ingredientId: string;
  quantity: number;
};

/**
 * Recursively resolve an ingredient into its leaf consumptions.
 * @param ingredientId - the ingredient to expand
 * @param multiplier - how much of this ingredient is needed
 * @param compositions - full composition edge list
 * @param visited - set of ingredient IDs in the current DFS path (cycle detection)
 * @returns map of leafIngredientId -> total quantity to deduct
 */
function resolveIngredient(
  ingredientId: string,
  multiplier: number,
  compositionsByParent: Map<string, CompositionEdge[]>,
  visited: Set<string>,
): Map<string, number> {
  const result = new Map<string, number>();

  const children = compositionsByParent.get(ingredientId);

  if (!children || children.length === 0) {
    // Leaf ingredient — deduct directly
    result.set(ingredientId, multiplier);
    return result;
  }

  if (visited.has(ingredientId)) {
    // Cycle detected — treat as leaf to avoid infinite recursion and log warning
    console.warn(`[recipe-resolver] Cycle detected at ingredientId=${ingredientId}; treating as leaf.`);
    result.set(ingredientId, multiplier);
    return result;
  }

  visited.add(ingredientId);

  for (const edge of children) {
    const subResult = resolveIngredient(
      edge.childIngredientId,
      multiplier * edge.quantityNeeded,
      compositionsByParent,
      new Set(visited),
    );
    for (const [leafId, qty] of subResult) {
      result.set(leafId, (result.get(leafId) ?? 0) + qty);
    }
  }

  return result;
}

/**
 * Expand a list of product recipe edges into flat leaf ingredient consumptions,
 * scaled by the sold quantity.
 *
 * @param recipe - product_ingredients rows for the product
 * @param soldQuantity - how many units of the product were sold
 * @param compositions - all ingredient_compositions rows (used to build traversal graph)
 * @returns flat list of { ingredientId, quantity } for leaf deductions
 */
export function resolveRecipe(
  recipe: RecipeEdge[],
  soldQuantity: number,
  compositions: CompositionEdge[],
): LeafConsumption[] {
  // Index compositions by parent for O(1) child lookup
  const compositionsByParent = new Map<string, CompositionEdge[]>();
  for (const edge of compositions) {
    const existing = compositionsByParent.get(edge.parentIngredientId);
    if (existing) {
      existing.push(edge);
    } else {
      compositionsByParent.set(edge.parentIngredientId, [edge]);
    }
  }

  const totals = new Map<string, number>();

  for (const recipeEdge of recipe) {
    const needed = recipeEdge.quantityUsed * soldQuantity;
    const leafMap = resolveIngredient(recipeEdge.ingredientId, needed, compositionsByParent, new Set());
    for (const [leafId, qty] of leafMap) {
      totals.set(leafId, (totals.get(leafId) ?? 0) + qty);
    }
  }

  return [...totals.entries()].map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
}

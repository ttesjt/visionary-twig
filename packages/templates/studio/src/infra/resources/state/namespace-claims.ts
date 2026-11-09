/** Prevent a late ancestor append from invalidating an already mounted descendant reader. */
export class NamespaceClaims {
  private readonly children = new Set<NamespaceClaims>();
  private owned: ReadonlySet<string> = new Set();
  private parent?: NamespaceClaims | undefined;
  attach(child: NamespaceClaims) {
    this.children.add(child);
    child.parent = this;
    return () => {
      this.children.delete(child);
      child.parent = undefined;
    };
  }
  update(ids: readonly string[]) {
    this.owned = new Set(ids);
  }
  assertAvailable(ids: readonly string[]) {
    for (let ancestor = this.parent; ancestor; ancestor = ancestor.parent) {
      if (ids.some((id) => ancestor.owned.has(id)))
        throw new Error('Namespace already belongs to an ancestor Provider.');
    }
    this.checkChildren(ids);
  }
  private checkChildren(ids: readonly string[]) {
    for (const child of this.children) {
      if (ids.some((id) => child.owned.has(id)))
        throw new Error('Namespace already belongs to a descendant Provider.');
      child.checkChildren(ids);
    }
  }
}

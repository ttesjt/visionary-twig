const RESOLVED_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/** Keep the tested pnpm v9 resolution closure, including optional platforms and peer variants. */
export function pruneLockfile(lock) {
  const snapshots = {};
  const packages = {};
  function visit(name, reference) {
    if (typeof reference !== 'string' || /^(?:link:|workspace:)/u.test(reference)) return;
    const alias = reference.startsWith('npm:') ? reference.slice(4) : reference;
    const key = Object.hasOwn(lock.snapshots ?? {}, name + '@' + alias)
      ? name + '@' + alias
      : alias;
    if (Object.hasOwn(snapshots, key)) return;
    const snapshot = lock.snapshots?.[key];
    if (!snapshot) {
      if (!lock.snapshots && !lock.packages) return; // Dependency-free synthetic locks need no resolutions.
      throw new Error('Missing lockfile snapshot for ' + name + ': ' + reference);
    }
    snapshots[key] = snapshot;
    const packageKey = key.split('(')[0];
    if (!lock.packages?.[packageKey]) throw new Error('Missing lockfile package: ' + packageKey);
    packages[packageKey] = lock.packages[packageKey];
    for (const group of ['dependencies', 'optionalDependencies'])
      for (const [dependency, version] of Object.entries(snapshot[group] ?? {}))
        visit(dependency, version);
  }
  for (const importer of Object.values(lock.importers ?? {}))
    for (const group of RESOLVED_GROUPS)
      for (const [name, value] of Object.entries(importer[group] ?? {})) visit(name, value.version);
  return {
    ...lock,
    ...(lock.packages ? { packages } : {}),
    ...(lock.snapshots ? { snapshots } : {}),
  };
}

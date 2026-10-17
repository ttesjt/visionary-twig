if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
  throw new Error('Use the pnpm version pinned in package.json to install this workspace.');
}

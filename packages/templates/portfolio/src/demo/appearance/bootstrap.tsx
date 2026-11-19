import { APPEARANCE_POLICY, appearanceBootstrapScript } from './policy';
/** Optional preview hook. Removing it leaves the statically imported site styles intact. */
export function AppearanceDemoBootstrap() {
  return (
    <script
      id="appearance-demo-bootstrap"
      dangerouslySetInnerHTML={{ __html: appearanceBootstrapScript(APPEARANCE_POLICY) }}
    />
  );
}

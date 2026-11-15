import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HeaderExtensionProvider, HeaderExtension } from '@frontend/ui/web-shell/header-extension';
import { SiteHeader } from '@frontend/ui/web-shell/header';
import { SiteFrame } from '@frontend/ui/web-shell';
import { Button } from '@frontend/ui';

function Fixture() {
  const [visible, setVisible] = useState(false);
  const [resource, setResource] = useState('First');
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <button onClick={() => setVisible(true)}>Show</button>
      <button onClick={() => setVisible(false)}>Hide</button>
      <button
        onClick={() => {
          setResource('Second');
          setVisible(true);
        }}
      >
        Replace
      </button>
      <button onClick={() => setMounted(false)}>Unmount</button>
      {mounted && (
        <HeaderExtensionProvider scope="fixture">
          <SiteHeader
            brand={{ label: 'Example', href: '/' }}
            items={[]}
            labels={{
              navigation: 'Main',
              openMenu: 'Menu',
              closeMenu: 'Close',
              menuTitle: 'Navigation',
            }}
          />
          <HeaderExtension resourceKey={resource} visible={visible}>
            <button>{resource} action</button>
          </HeaderExtension>
        </HeaderExtensionProvider>
      )}
    </>
  );
}

function LayoutFixture({ params }: { readonly params: URLSearchParams }) {
  const sticky = params.get('position') === 'sticky';
  return (
    <SiteFrame
      skipLabel="Skip"
      header={
        <SiteHeader
          {...(sticky ? { position: 'sticky' } : {})}
          brand={{ label: 'Example', href: '/' }}
          items={[{ id: 'docs', href: '/docs', label: 'Docs' }]}
          actions={{ label: 'Utilities', items: [{ id: 'help', href: '/help', label: 'Help' }] }}
          labels={{
            navigation: 'Main',
            openMenu: 'Menu',
            closeMenu: 'Close',
            menuTitle: 'Pages',
          }}
        />
      }
    >
      <h1>Example page</h1>
      <Button>Example action</Button>
      {Array.from({ length: 64 }, (_, index) => (
        <p key={index}>Section {index + 1}</p>
      ))}
    </SiteFrame>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing fixture root');
const params = new URLSearchParams(window.location.search);
createRoot(root).render(params.has('layout') ? <LayoutFixture params={params} /> : <Fixture />);

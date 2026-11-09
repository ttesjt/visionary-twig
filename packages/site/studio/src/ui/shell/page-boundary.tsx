import { Component, type ReactNode } from 'react';
import type { StudioShellTextCatalog } from './text-catalog.js';

interface BoundaryState {
  readonly failed: boolean;
  readonly identity: string | undefined;
}
/** A broken extension must leave the workspace navigation available. */
export class StudioPageBoundary extends Component<
  {
    readonly children: ReactNode;
    readonly text: StudioShellTextCatalog;
    readonly resetKey: string;
  },
  BoundaryState
> {
  state: BoundaryState = { failed: false, identity: undefined };
  // Reset failures on child navigation without remounting a healthy resource layout/provider.
  static getDerivedStateFromProps(
    props: { readonly resetKey: string },
    state: BoundaryState
  ): Partial<BoundaryState> | null {
    return props.resetKey !== state.identity ? { failed: false, identity: props.resetKey } : null;
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ui-studio-surface ui-studio-empty" role="alert">
        <p>{this.props.text.pageFailed}</p>
        <button
          type="button"
          className="ui-studio-button"
          onClick={() => this.setState({ failed: false })}
        >
          {this.props.text.retry}
        </button>
      </div>
    );
  }
}

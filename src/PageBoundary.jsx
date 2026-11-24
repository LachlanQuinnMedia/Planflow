// src/PageBoundary.jsx
import { Component } from 'react'
import { reportError } from './errorReport'

// Wraps a page. If the page breaks, the menu and the rest of the app carry on.
export default class PageBoundary extends Component {
  constructor(props) { super(props); this.state = { broken: false } }
  static getDerivedStateFromError() { return { broken: true } }
  componentDidCatch(error, info) { reportError(error, `Page crashed${info?.componentStack ? ':' + info.componentStack.split('\n').slice(0, 4).join(' <') : ''}`) }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.broken) this.setState({ broken: false }) }
  render() {
    if (!this.state.broken) return this.props.children
    return (
      <div data-testid="page-broken" className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="text-sm font-semibold mb-1">This page hit a problem</div>
        <div className="text-xs text-gray-500 mb-4">Nothing you saved is lost. QPlan has been told about it. Try again, or go to another page from the menu.</div>
        <button onClick={() => this.setState({ broken: false })} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Try again</button>
      </div>
    )
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ENG OSAMA render error', error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="section"><div className="container"><div className="surface empty error-boundary">
      <span className="tag">حدث خطأ</span><h1 className="section-title">حصلت مشكلة غير متوقعة</h1>
      <p className="muted">جرّب تحديث الصفحة. لو المشكلة مستمرة، تواصل مع إدارة المنصة.</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>تحديث الصفحة</button>
    </div></div></main>;
  }
}

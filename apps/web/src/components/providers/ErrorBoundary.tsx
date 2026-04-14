"use client";

import { Component, type ReactNode } from "react";
import { css } from "@emotion/css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * React ErrorBoundary
 * 하위 트리에서 발생한 렌더링 에러를 잡아 fallback UI를 표시한다.
 * 훅(useEffect 등)에서 발생하는 비동기 에러는 잡지 않는다.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className={styles.container}>
          <div className={styles.box}>
            <h2 className={styles.title}>오류가 발생했습니다</h2>
            <p className={styles.message}>{this.state.message}</p>
            <button className={styles.btn} onClick={this.handleReset}>
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: css`
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0f0f;
  `,
  box: css`
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 12px;
    padding: 32px 40px;
    text-align: center;
    max-width: 400px;
  `,
  title: css`
    color: #f87171;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
  `,
  message: css`
    color: #9ca3af;
    font-size: 13px;
    margin-bottom: 24px;
    line-height: 1.6;
    word-break: break-word;
  `,
  btn: css`
    padding: 8px 24px;
    border-radius: 6px;
    background: #2563eb;
    color: #fff;
    border: none;
    font-size: 14px;
    cursor: pointer;
    &:hover { background: #1d4ed8; }
  `,
};

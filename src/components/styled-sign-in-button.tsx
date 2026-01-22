'use client';

import { SignInButton } from '@clerk/nextjs';

export function StyledSignInButton({ children, style, ...props }: { children: React.ReactNode; style?: React.CSSProperties; [key: string]: any }) {
  return (
    <SignInButton mode="modal" {...props}>
      <button style={style}>
        {children}
      </button>
    </SignInButton>
  );
}

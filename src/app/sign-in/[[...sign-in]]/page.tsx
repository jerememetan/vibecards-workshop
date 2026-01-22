import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <SignIn />
    </div>
  );
}

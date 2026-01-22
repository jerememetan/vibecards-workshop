import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <SignUp />
    </div>
  );
}

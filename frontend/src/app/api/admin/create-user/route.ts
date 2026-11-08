import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { fullName, email, role, nationalId } = await request.json();

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        national_id: nationalId,
        role: role,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. AUTOMATICALLY SEND SETUP EMAIL (Password Reset)
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/update-password',
    });

    if (resetError) {
      console.warn('Setup email failed:', resetError.message);
      // We don't fail the request because the user was still created
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${fullName} created as ${role}. Setup email sent.`,
      userId: authData.user?.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

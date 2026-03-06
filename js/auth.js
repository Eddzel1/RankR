// Authentication Module

async function loginWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Verify user exists in admin_users and is active
    const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .single();

    if (adminError || !adminUser) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Your account is not authorized or has been deactivated.');
    }

    return { user: data.user, adminUser };
}

async function logout() {
    await supabase.auth.signOut();
    window.location.hash = '#login';
}

async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

    return adminUser ? { user: session.user, adminUser } : null;
}

async function requireAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.hash = '#login';
        return null;
    }
    return currentUser;
}

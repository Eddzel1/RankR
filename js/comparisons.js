// Comparisons Module

async function recordVote(winnerId, loserId) {
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
        .from('comparisons')
        .insert({
            winner_id: winnerId,
            loser_id: loserId,
            voted_by: session?.user?.id || null
        });

    if (error) throw error;
    return data;
}

async function getRankings(limit = 50) {
    // Get all comparisons
    const { data: comparisons, error } = await supabase
        .from('comparisons')
        .select('winner_id, loser_id');

    if (error) throw error;

    // Aggregate win rates
    const stats = {};

    for (const comp of comparisons) {
        // Winner
        if (!stats[comp.winner_id]) {
            stats[comp.winner_id] = { wins: 0, losses: 0, total: 0 };
        }
        stats[comp.winner_id].wins++;
        stats[comp.winner_id].total++;

        // Loser
        if (!stats[comp.loser_id]) {
            stats[comp.loser_id] = { wins: 0, losses: 0, total: 0 };
        }
        stats[comp.loser_id].losses++;
        stats[comp.loser_id].total++;
    }

    // Convert to array and sort by win rate
    const rankings = Object.entries(stats)
        .map(([id, s]) => ({
            student_id: id,
            wins: s.wins,
            losses: s.losses,
            total: s.total,
            winRate: s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : '0.0'
        }))
        .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate) || b.total - a.total)
        .slice(0, limit);

    // Enrich with student data
    const studentIds = rankings.map(r => r.student_id);
    if (studentIds.length === 0) return [];

    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('id', studentIds);

    if (studentsError) throw studentsError;

    const studentMap = {};
    for (const s of students) {
        studentMap[s.id] = s;
    }

    for (const ranking of rankings) {
        const student = studentMap[ranking.student_id];
        if (student) {
            ranking.student = student;
            ranking.student._photoUrl = await getStudentPhotoUrl(student);
            ranking.student._fullName = formatStudentName(student);
            ranking.student._age = getStudentAge(student.birthday);
        }
    }

    return rankings;
}

async function getDashboardStats() {
    const { count: totalComparisons } = await supabase
        .from('comparisons')
        .select('*', { count: 'exact', head: true });

    const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

    return {
        totalComparisons: totalComparisons || 0,
        totalStudents: totalStudents || 0,
    };
}

// Students Module

// Cache to avoid re-fetching all student IDs every time
let _studentIds = null;

async function getAllStudentIds() {
    if (_studentIds) return _studentIds;
    const { data, error } = await supabase
        .from('students')
        .select('id');
    if (error) throw error;
    _studentIds = data.map(s => s.id);
    return _studentIds;
}

async function getTwoRandomStudents() {
    const ids = await getAllStudentIds();
    if (ids.length < 2) throw new Error('Not enough students in the database');

    // Pick two different random indices
    const i = Math.floor(Math.random() * ids.length);
    let j = Math.floor(Math.random() * (ids.length - 1));
    if (j >= i) j++;

    const id1 = ids[i];
    const id2 = ids[j];

    const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('id', [id1, id2]);

    if (error) throw error;

    // Enrich with profile photo URLs
    for (const student of data) {
        student._photoUrl = await getStudentPhotoUrl(student);
        student._age = getStudentAge(student.birthday);
        student._fullName = formatStudentName(student);
    }

    return data;
}

async function getStudentPhotoUrl(student) {
    // First try profile_picture_url column
    if (student.profile_picture_url) {
        // If it's a relative path, construct the full storage URL
        if (student.profile_picture_url.startsWith('http')) {
            return student.profile_picture_url;
        }
        return `https://jqgxzlvhmcwomkdeiryt.supabase.co/storage/v1/object/public/${student.profile_picture_url}`;
    }

    // Fallback: try to find profile picture in the bucket
    try {
        const { data: files, error } = await supabase.storage
            .from('student-documents')
            .list(student.id, { search: 'profile-picture' });

        if (!error && files && files.length > 0) {
            const profilePic = files.find(f => f.name.startsWith('profile-picture'));
            if (profilePic) {
                return `https://jqgxzlvhmcwomkdeiryt.supabase.co/storage/v1/object/public/student-documents/${student.id}/${profilePic.name}`;
            }
        }
    } catch (e) {
        console.warn('Could not fetch profile picture from storage:', e);
    }

    // Default placeholder
    return null;
}

function getStudentAge(birthday) {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function formatStudentName(student) {
    const parts = [];
    if (student.lastname) parts.push(student.lastname + ',');
    if (student.firstname) parts.push(student.firstname);
    if (student.middlename) parts.push(student.middlename);
    if (student.extension && student.extension !== 'EMPTY') parts.push(student.extension);
    return parts.join(' ');
}

async function getStudentById(id) {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;

    data._photoUrl = await getStudentPhotoUrl(data);
    data._age = getStudentAge(data.birthday);
    data._fullName = formatStudentName(data);
    return data;
}

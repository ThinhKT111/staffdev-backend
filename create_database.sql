-- Script tạo cấu trúc cơ sở dữ liệu cho hệ thống StaffDev
-- Tương thích với PostgreSQL 16.8

-- Tạo bảng Departments (ban đầu không có manager_id)
CREATE TABLE Departments (
    department_id BIGSERIAL PRIMARY KEY,
    department_name VARCHAR NOT NULL
);

-- Tạo bảng Users
CREATE TABLE Users (
    user_id BIGSERIAL PRIMARY KEY,
    cccd VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    phone VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('Admin', 'Employee', 'TeamLeader', 'SeniorManager')),
    department_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES Departments(department_id)
);

-- Tạo index cho tìm kiếm User
CREATE INDEX idx_users_cccd ON Users(cccd);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
CREATE INDEX idx_users_department ON Users(department_id);

-- Cập nhật bảng Departments để thêm manager_id trỏ đến Users
ALTER TABLE Departments 
ADD COLUMN manager_id BIGINT,
ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES Users(user_id);

-- Tạo bảng Profiles (thông tin cá nhân)
CREATE TABLE Profiles (
    profile_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    address TEXT,
    experience TEXT,
    skills TEXT,
    avatar_url VARCHAR,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm Profile
CREATE INDEX idx_profiles_user_id ON Profiles(user_id);

-- Tạo bảng Attendance (điểm danh)
CREATE TABLE Attendance (
    attendance_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    overtime_hours DECIMAL(5,2),
    leave_type VARCHAR CHECK (leave_type IN ('Annual', 'Sick', 'Unpaid')),
    leave_date DATE,
    status VARCHAR CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm Attendance
CREATE INDEX idx_attendance_user_id ON Attendance(user_id);
CREATE INDEX idx_attendance_check_in ON Attendance(check_in);
CREATE INDEX idx_attendance_leave_date ON Attendance(leave_date);

-- Tạo bảng TrainingPaths (lộ trình đào tạo)
CREATE TABLE TrainingPaths (
    training_path_id BIGSERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    department_id BIGINT,
    duration VARCHAR CHECK (duration IN ('ShortTerm', 'LongTerm')),
    created_by BIGINT NOT NULL,
    total_courses INT DEFAULT 0,
    duration_in_weeks INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES Departments(department_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

-- Tạo index cho tìm kiếm TrainingPaths
CREATE INDEX idx_training_paths_department ON TrainingPaths(department_id);
CREATE INDEX idx_training_paths_is_active ON TrainingPaths(is_active);

-- Tạo bảng TrainingCourses (các khóa học)
CREATE TABLE TrainingCourses (
    course_id BIGSERIAL PRIMARY KEY,
    training_path_id BIGINT NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    type VARCHAR CHECK (type IN ('Online', 'Offline', 'Video', 'Document')),
    duration_hours INT,
    level VARCHAR CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    total_lessons INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (training_path_id) REFERENCES TrainingPaths(training_path_id)
);

-- Tạo index cho tìm kiếm TrainingCourses
CREATE INDEX idx_training_courses_path_id ON TrainingCourses(training_path_id);
CREATE INDEX idx_training_courses_is_active ON TrainingCourses(is_active);
CREATE INDEX idx_training_courses_level ON TrainingCourses(level);

-- Tạo bảng UserCourses (người dùng đăng ký khóa học)
CREATE TABLE UserCourses (
    user_course_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    status VARCHAR CHECK (status IN ('NotStarted', 'InProgress', 'Completed')),
    completion_date TIMESTAMP,
    score DECIMAL(5,2),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES TrainingCourses(course_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm UserCourses
CREATE INDEX idx_user_courses_user_id ON UserCourses(user_id);
CREATE INDEX idx_user_courses_course_id ON UserCourses(course_id);
CREATE INDEX idx_user_courses_status ON UserCourses(status);

-- Tạo bảng Tasks (nhiệm vụ)
CREATE TABLE Tasks (
    task_id BIGSERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    assigned_to BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL,
    deadline TIMESTAMP,
    status VARCHAR CHECK (status IN ('Pending', 'InProgress', 'Completed', 'Rejected')),
    score DECIMAL(5,2),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES Users(user_id),
    FOREIGN KEY (assigned_by) REFERENCES Users(user_id)
);

-- Tạo index cho tìm kiếm Tasks
CREATE INDEX idx_tasks_assigned_to ON Tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON Tasks(assigned_by);
CREATE INDEX idx_tasks_status ON Tasks(status);
CREATE INDEX idx_tasks_deadline ON Tasks(deadline);

-- Tạo bảng Assignments (bài tập)
CREATE TABLE Assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    max_submissions INT,
    deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES TrainingCourses(course_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm Assignments
CREATE INDEX idx_assignments_course_id ON Assignments(course_id);
CREATE INDEX idx_assignments_deadline ON Assignments(deadline);

-- Tạo bảng Submissions (bài nộp)
CREATE TABLE Submissions (
    submission_id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    submission_content TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    testcase_passed INT,
    total_testcases INT,
    FOREIGN KEY (assignment_id) REFERENCES Assignments(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm Submissions
CREATE INDEX idx_submissions_assignment_id ON Submissions(assignment_id);
CREATE INDEX idx_submissions_user_id ON Submissions(user_id);
CREATE INDEX idx_submissions_submitted_at ON Submissions(submitted_at);

-- Tạo bảng Documents (tài liệu)
CREATE TABLE Documents (
    document_id BIGSERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    file_url VARCHAR NOT NULL,
    category VARCHAR,
    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)
);

-- Tạo index cho tìm kiếm Documents
CREATE INDEX idx_documents_category ON Documents(category);
CREATE INDEX idx_documents_uploaded_by ON Documents(uploaded_by);
CREATE INDEX idx_documents_uploaded_at ON Documents(uploaded_at);

-- Tạo bảng Notifications (thông báo)
CREATE TABLE Notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR NOT NULL,
    content TEXT,
    type VARCHAR CHECK (type IN ('Task', 'Assignment', 'Training', 'General')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm Notifications
CREATE INDEX idx_notifications_user_id ON Notifications(user_id);
CREATE INDEX idx_notifications_is_read ON Notifications(is_read);
CREATE INDEX idx_notifications_type ON Notifications(type);
CREATE INDEX idx_notifications_created_at ON Notifications(created_at);

-- Tạo bảng ForumPosts (bài viết trên diễn đàn)
CREATE TABLE ForumPosts (
    post_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm ForumPosts
CREATE INDEX idx_forum_posts_user_id ON ForumPosts(user_id);
CREATE INDEX idx_forum_posts_created_at ON ForumPosts(created_at);

-- Tạo bảng ForumComments (bình luận trên diễn đàn)
CREATE TABLE ForumComments (
    comment_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES ForumPosts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Tạo index cho tìm kiếm ForumComments
CREATE INDEX idx_forum_comments_post_id ON ForumComments(post_id);
CREATE INDEX idx_forum_comments_user_id ON ForumComments(user_id);
CREATE INDEX idx_forum_comments_created_at ON ForumComments(created_at);

-- Fix để đảm bảo không gặp lỗi sequence
-- Script này sẽ đặt lại giá trị tiếp theo của mỗi sequence dựa trên giá trị ID lớn nhất hiện có
SELECT setval('assignments_assignment_id_seq', (SELECT MAX(assignment_id) FROM Assignments));
SELECT setval('attendance_attendance_id_seq', (SELECT MAX(attendance_id) FROM Attendance));
SELECT setval('departments_department_id_seq', (SELECT MAX(department_id) FROM Departments));
SELECT setval('documents_document_id_seq', (SELECT MAX(document_id) FROM Documents));
SELECT setval('forumcomments_comment_id_seq', (SELECT MAX(comment_id) FROM ForumComments));
SELECT setval('forumposts_post_id_seq', (SELECT MAX(post_id) FROM ForumPosts));
SELECT setval('notifications_notification_id_seq', (SELECT MAX(notification_id) FROM Notifications));
SELECT setval('profiles_profile_id_seq', (SELECT MAX(profile_id) FROM Profiles));
SELECT setval('submissions_submission_id_seq', (SELECT MAX(submission_id) FROM Submissions));
SELECT setval('tasks_task_id_seq', (SELECT MAX(task_id) FROM Tasks));
SELECT setval('trainingcourses_course_id_seq', (SELECT MAX(course_id) FROM TrainingCourses));
SELECT setval('trainingpaths_training_path_id_seq', (SELECT MAX(training_path_id) FROM TrainingPaths));
SELECT setval('usercourses_user_course_id_seq', (SELECT MAX(user_course_id) FROM UserCourses));
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM Users));
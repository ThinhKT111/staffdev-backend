-- Fix sequences to start from the highest existing ID
SELECT setval('tasks_task_id_seq', (SELECT MAX(task_id) FROM tasks));
SELECT setval('forumposts_post_id_seq', (SELECT MAX(post_id) FROM forumposts));
SELECT setval('attendance_attendance_id_seq', (SELECT MAX(attendance_id) FROM attendance));
SELECT setval('documents_document_id_seq', (SELECT MAX(document_id) FROM documents));
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('profiles_profile_id_seq', (SELECT MAX(profile_id) FROM profiles));
SELECT setval('departments_department_id_seq', (SELECT MAX(department_id) FROM departments));
SELECT setval('trainingpaths_training_path_id_seq', (SELECT MAX(training_path_id) FROM trainingpaths));
SELECT setval('trainingcourses_course_id_seq', (SELECT MAX(course_id) FROM trainingcourses));
SELECT setval('usercourses_user_course_id_seq', (SELECT MAX(user_course_id) FROM usercourses));
SELECT setval('assignments_assignment_id_seq', (SELECT MAX(assignment_id) FROM assignments));
SELECT setval('submissions_submission_id_seq', (SELECT MAX(submission_id) FROM submissions));
SELECT setval('notifications_notification_id_seq', (SELECT MAX(notification_id) FROM notifications));
SELECT setval('forumcomments_comment_id_seq', (SELECT MAX(comment_id) FROM forumcomments));

-- Output the current sequence values for verification
SELECT 'tasks_task_id_seq', currval('tasks_task_id_seq');
SELECT 'forumposts_post_id_seq', currval('forumposts_post_id_seq');
SELECT 'attendance_attendance_id_seq', currval('attendance_attendance_id_seq');
SELECT 'documents_document_id_seq', currval('documents_document_id_seq');
SELECT 'users_user_id_seq', currval('users_user_id_seq');
SELECT 'profiles_profile_id_seq', currval('profiles_profile_id_seq'); 
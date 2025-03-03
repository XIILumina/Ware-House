import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FaCheck, FaTimes } from 'react-icons/fa'; // Import the icons

const ClassPage = ({ classId, availableWorks, auth }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [works, setWorks] = useState(Array.isArray(availableWorks) ? availableWorks : []);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState({});
    const [newComment, setNewComment] = useState({});
    const [error, setError] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editedComment, setEditedComment] = useState('');
    const [grades, setGrades] = useState({}); // Store grades for each student's submission


    const fetchAvailableWorks = async () => {
        try {
            const response = await fetch(`/class/${classId}/works`);
            const data = await response.json();
            setWorks(Array.isArray(data.works) ? data.works : []);
        } catch (error) {
            console.error('Error fetching works or comments:', error);
        }
    };

    const handleCreateWork = async () => {
        try {
            const formData = new FormData();
            formData.append('classId', classId);
            formData.append('title', title);
            formData.append('description', description);
            if (file) {
                formData.append('file', file);
            }

            const response = await fetch(`/class/${classId}/works/store`, {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: formData,
            });

            if (response.ok) {
                setTitle('');
                setDescription('');
                setFile(null);
                fetchAvailableWorks();
                setIsFormVisible(false);
            } else {
                console.error('Error creating work:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleStatusChange = async (workId, currentStatus) => {
        const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';

        try {
            const response = await fetch(`/class/${classId}/works/${workId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setWorks((prevWorks) =>
                    prevWorks.map((work) =>
                        work.id === workId ? { ...work, status: newStatus } : work
                    )
                );
            } else {
                console.error('Error updating status:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleFileChange = (workId, file) => {
        setSelectedFiles((prev) => ({
            ...prev,
            [workId]: file,
        }));
    };

    const handleFileUpload = async (workId) => {
        const selectedFile = selectedFiles[workId];

        if (!selectedFile) {
            alert("Please select a file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('workId', workId);

        try {
            const response = await fetch(`/class/${classId}/works/${workId}/add-file`, {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: formData,
            });

            if (response.ok) {
                fetchAvailableWorks();
                alert("File uploaded successfully!");
            } else {
                console.error('Error uploading file:', response.statusText);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleCommentChange = (workId, value) => {
        setNewComment((prev) => ({
            ...prev,
            [workId]: value,
        }));
    };
    const handleEditComment = (commentId, currentText) => {
        setEditingCommentId(commentId);
        setEditedComment(currentText);
    };

    const handleEditCommentSubmit = async (workId, commentId) => {
        if (!editedComment) {
            alert("Please enter a comment.");
            return;
        }

        try {
            const response = await fetch(`/class/${classId}/works/${workId}/comments/${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ text: editedComment }),
            });

            if (response.ok) {
                setEditingCommentId(null);
                setEditedComment('');
                fetchAvailableWorks();
            } else {
                setError('Failed to update comment.');
            }
        } catch (error) {
            setError('An error occurred while updating the comment.');
        }
    };
    const handleDeleteComment = async (workId, commentId) => {
        try {
            const response = await fetch(`/class/${classId}/works/${workId}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
            });

            if (response.ok) {
                fetchAvailableWorks();
            } else {
                setError('Failed to delete comment.');
            }
        } catch (error) {
            setError('An error occurred while deleting the comment.');
        }
    };
    const handleCommentSubmit = async (workId) => {
        const commentText = newComment[workId];
        if (!commentText) {
            alert("Please enter a comment.");
            return;
        }


        try {
            const response = await fetch(`/class/${classId}/works/${workId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ text: commentText }),
            });

            if (response.ok) {
                setNewComment((prev) => ({
                    ...prev,
                    [workId]: '', // Clear the comment input
                }));
                fetchAvailableWorks(); // Refresh works to include new comment
            } else {
                console.error('Error submitting comment:', response.statusText);
                setError('Failed to submit comment.'); // Set error message
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred while submitting the comment.'); // Set error message
        }
    };

    const handleGradeChange = (workId, userId, value) => {
        setGrades((prev) => ({
            ...prev,
            [workId]: {
                ...(prev[workId] || {}),
                [userId]: value,
            },
        }));
    };

    const handleGradeSubmit = async (workId, userId) => {
        const grade = grades[workId]?.[userId];
        if (grade === undefined) {
            alert("Please enter a grade.");
            return;
        }

        try {
            const response = await fetch(`/class/${classId}/works/${workId}/grade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ userId, grade }),
            });

            if (response.ok) {
                fetchAvailableWorks(); // Refresh the works to show updated grades
            } else {
                console.error('Error submitting grade:', response.statusText);
                setError('Failed to submit grade.'); // Set error message
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred while submitting the grade.'); // Set error message
        }
    };

    useEffect(() => {
        fetchAvailableWorks();
    }, [classId]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100'; // Light green background for approved
            case 'pending':
                return 'bg-yellow-100'; // Light yellow background for pending
            case 'rejected':
                return 'bg-red-100'; // Light red background for rejected
            default:
                return 'bg-white'; // Default background
        }
    };

    return (
        <AuthenticatedLayout user={auth}>
            <div className="flex min-h-screen bg-gray-50">
                <aside className="w-64 bg-white shadow-lg border-r border-gray-200 p-6">
                    <h2 className="text-2xl font-bold text-blue-600">Menu</h2>
                    <nav className="mt-4">
                        <ul>
                            <li className="mb-2">
                                <a href="/dashboard" className="block p-3 text-gray-600 hover:bg-blue-100 rounded transition duration-200">
                                    Home Page
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="/courses" className="block p-3 text-gray-600 hover:bg-blue-100 rounded transition duration-200">
                                    Courses
                                </a>
                            </li>
                        </ul>
                    </nav>

                    <div className="mt-6">
                        <button
                            onClick={() => setIsFormVisible(!isFormVisible)}
                            className="bg-blue-600 text-white rounded p-2 hover:bg-blue-500 transition duration-300 shadow-md w-full text-left"
                        >
                            Create New Work
                        </button>
                        {isFormVisible && (
                            <form onSubmit={(e) => { e.preventDefault(); handleCreateWork(); }} className="bg-white p-4 rounded-lg shadow-md mt-2">
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Work Title"
                                        className="border border-gray-300 rounded p-2 w-full mb-2"
                                    />
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Work Description"
                                        className="border border-gray-300 rounded p-2 w-full mb-2"
                                    ></textarea>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white rounded p-2 hover:bg-blue-500 transition duration-300 shadow-md"
                                    >
                                        Create Work
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </aside>

                <main className="flex-1 p-8">
                    {/* <h1 className="text-3xl font-bold text-gray-800 mb-6">Class ID: {classId}</h1> */}

                    <div>
                        <h2 className="text-xl font-semibold mb-2">Available Works</h2>
                        <ul className="mt-4">
                            {works.length === 0 ? (
                                <li className="text-gray-500 italic">No works available.</li>
                            ) : (
                                works.map((work) => (
                                    <li key={work.id} className={`border border-gray-300 p-4 rounded-lg mb-4 ${getStatusClass(work.status)}`}>
                                        <h3 className="font-bold text-lg">{work.title}</h3>
                                        <p className="text-gray-700">{work.description}</p>
                                        <p className="text-sm text-gray-500">Status: {work.status}</p>


                                        {Array.isArray(work.submissions) && work.submissions.length > 0 ? (
                work.submissions.map((submission) => (
                    <div key={submission.id} className="mt-4">
                        <h4 className="font-semibold">{submission.studentName}'s Submission</h4>
                        <p>Grade: 
                            <input
                                type="number"
                                value={grades[work.id]?.[submission.userId] || ''}
                                onChange={(e) => handleGradeChange(work.id, submission.userId, e.target.value)}
                                className="border border-gray-300 rounded p-2 w-20"
                            />
                            <button onClick={() => handleGradeSubmit(work.id, submission.userId)} className="ml-2 bg-blue-600 text-white rounded p-1 hover:bg-blue-500 transition duration-300">
                                Submit Grade
                            </button>
                        </p>
                    </div>
                ))
            ) : (
                <p className="text-gray-500 italic">No submissions available.</p>
            )}

                                        {work.comments && work.comments.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="font-semibold">Comments</h4>
                                                {work.comments.map((comment) => (
                                                    <div key={comment.id} className="border border-gray-200 p-2 rounded mt-2 bg-gray-50">
                                                        {editingCommentId === comment.id ? (
                                                            <div>
                                                                <textarea
                                                                    value={editedComment}
                                                                    onChange={(e) => setEditedComment(e.target.value)}
                                                                    className="border border-gray-300 rounded p-2 w-full"
                                                                ></textarea>
                                                                <button
                                                                    onClick={() => handleEditCommentSubmit(work.id, comment.id)}
                                                                    className="mt-2 bg-blue-600 text-white rounded p-1 hover:bg-blue-500 transition duration-300"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p>{comment.text}</p>
                                                                <button
                                                                    onClick={() => handleEditComment(comment.id, comment.text)}
                                                                    className="text-blue-600 hover:text-blue-500 mr-2"
                                                                >
                                                                    Edit
                                                                </button>
                                                                {/* Render delete button only if the user has the "teacher" role */}
                                                                {auth.user.role === "teacher"  && ( // Assuming `auth.user.role` contains the user's role
                                                                    <button
                                                                        onClick={() => handleDeleteComment(work.id, comment.id)}
                                                                        className="text-red-600 hover:text-red-500"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                                {auth.user.role === "admin"  && ( // Assuming `auth.user.role` contains the user's role
                                                                    <button
                                                                        onClick={() => handleDeleteComment(work.id, comment.id)}
                                                                        className="text-red-600 hover:text-red-500"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <textarea
                                            value={newComment[work.id] || ''}
                                            onChange={(e) => handleCommentChange(work.id, e.target.value)}
                                            placeholder="Add a comment..."
                                            className="border border-gray-300 rounded p-2 w-full mt-2"
                                        ></textarea>
                                        <button
                                            onClick={() => handleCommentSubmit(work.id)}
                                            className="mt-2 bg-blue-600 text-white rounded p-1 hover:bg-blue-500 transition duration-300"
                                        >
                                            Submit Comment
                                        </button>
                                        {error && <p className="text-red-500 mt-2">{error}</p>}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </main>
            </div>
        </AuthenticatedLayout>
    );
};

export default ClassPage;

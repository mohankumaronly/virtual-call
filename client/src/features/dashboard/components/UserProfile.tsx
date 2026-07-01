import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import type { PublicUser, ApiResponse } from '../../../types';
import toast from 'react-hot-toast';

const UserProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<PublicUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await api.get<ApiResponse<PublicUser>>(
                    `/api/users/${id}`
                );
                if (response.data.success && response.data.data) {
                    setUser(response.data.data);
                } else {
                    toast.error(response.data.message || 'Failed to load user');
                }
            } catch (error: any) {
                const message = error.response?.data?.message || 'Failed to load user';
                toast.error(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    if (isLoading) {
        return (
            <div>
                <div>Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div>
                <div>User not found</div>
            </div>
        );
    }

    return (
        <div>
            <button onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
            </button>
            
            <div>
                <div>
                    {user.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt={user.name}
                        />
                    ) : (
                        <div>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h2>{user.name}</h2>
                    <p>@{user.username}</p>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
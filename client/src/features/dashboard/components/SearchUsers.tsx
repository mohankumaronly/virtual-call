import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import type { PublicUser, ApiResponse } from '../../../types';
import toast from 'react-hot-toast';

interface SearchUsersProps {
    onSelectUser: (userId: number) => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ onSelectUser }) => {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            toast.error('Please enter a search term');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<PublicUser[]>>(
                `/api/users/search?q=${encodeURIComponent(query)}`
            );
            if (response.data.success && response.data.data) {
                setUsers(response.data.data);
            } else {
                toast.error(response.data.message || 'No users found');
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Search failed';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserClick = (userId: number) => {
        navigate(`/profile/${userId}`);
    };

    return (
        <div>
            <form onSubmit={handleSearch}>
                <div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or username..."
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </form>

            {users.length > 0 && (
                <div>
                    {users.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => handleUserClick(user.id)}
                        >
                            <div>
                                <p>{user.name}</p>
                                <p>@{user.username}</p>
                            </div>
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
                        </div>
                    ))}
                </div>
            )}

            {users.length === 0 && query && !isLoading && (
                <p>No users found</p>
            )}
        </div>
    );
};

export default SearchUsers;
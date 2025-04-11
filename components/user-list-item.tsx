"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StarIcon } from "lucide-react"

// User list item component for displaying similar users
interface UserListItemProps {
  user: {
    id: string;
    name: string;
    image_url?: string;
    review_count?: number;
    common_categories?: string[];
    similarity_score?: number;
  };
}

export default function UserListItem({ user }: UserListItemProps) {
  // Extract user properties
  const displayName = user.name || `User ${user.id.substring(0, 8)}`;
  const initials = displayName.substring(0, 2).toUpperCase();
  
  return (
    <div className="flex items-start p-4 hover:bg-gray-50">
      <div className="flex-shrink-0 mr-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          {user.image_url ? (
            <img 
              src={user.image_url}
              alt={`${displayName}'s avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              {initials}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">{displayName}</h4>
          
          {/* Show similarity score as a badge when available */}
          {user.similarity_score !== undefined && (
            <span 
              className={`text-xs px-2 py-1 rounded-full ${
                user.similarity_score > 0.7 
                  ? 'bg-green-100 text-green-800' 
                  : user.similarity_score > 0.4 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {Math.round(user.similarity_score * 100)}% match
            </span>
          )}
        </div>
        
        <div className="mt-1 flex items-center text-sm text-gray-500">
          <span>{user.review_count || 0} reviews</span>
        </div>
        
        {user.common_categories && user.common_categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {user.common_categories.map((category, i) => (
              <span 
                key={i} 
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


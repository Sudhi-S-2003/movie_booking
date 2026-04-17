import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminDashboard = () => {
    return <Navigate to="/admin/overview" replace />;
};

export default AdminDashboard;

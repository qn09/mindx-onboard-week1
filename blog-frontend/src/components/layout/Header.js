import React from 'react';
import { Search, Plus, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function Header({ searchQuery, setSearchQuery, onCreateClick }) {
  const { user, login, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-top">
          <h1 className="logo">
            <span className="logo-main">Nhật Ký</span>
            <span className="logo-sub">của tôi</span>
          </h1>
          
          <div className="header-actions">
            {user ? (
              <>
                <button className="create-btn" onClick={onCreateClick} title="Viết bài mới">
                  <Plus size={20} />
                  <span>Viết bài</span>
                </button>
                <div className="user-menu">
                  <div className="user-status">
                    <span className="status-indicator"></span>
                    <span className="status-text">Đã đăng nhập</span>
                  </div>
                  <img src={user.avatar} alt={user.name} className="user-avatar" />
                  <span className="user-name">{user.name}</span>
                  <button className="logout-btn" onClick={logout}>
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="not-logged-in">
                <span className="status-text">Chưa đăng nhập</span>
                <button className="login-btn" onClick={login} title="Đăng nhập để truy cập các tính năng">
                  <LogIn size={20} />
                  <span>Đăng nhập</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
    </header>
  );
}

export default Header;

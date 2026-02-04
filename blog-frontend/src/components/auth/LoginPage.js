import React from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          <div className="login-header">
            <h1 className="login-logo">
              <span className="logo-main">Nhật Ký</span>
              <span className="logo-sub">của tôi</span>
            </h1>
            <p className="login-tagline">Chia sẻ câu chuyện của bạn với thế giới</p>
          </div>

          <div className="login-illustration">
            <div className="illustration-circle"></div>
            <div className="illustration-icon">📝</div>
          </div>

          <div className="login-actions">
            <p className="login-description">
              Đăng nhập để viết bài, bình luận và tương tác với cộng đồng
            </p>
            <button className="login-page-btn" onClick={login}>
              <LogIn size={24} />
              <span>Đăng nhập ngay</span>
            </button>
          </div>

          <div className="login-features">
            <div className="feature-item">
              <div className="feature-icon">✍️</div>
              <div className="feature-text">Viết bài</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💬</div>
              <div className="feature-text">Bình luận</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">❤️</div>
              <div className="feature-text">Thích bài viết</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

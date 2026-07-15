import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, Typography, message, Layout, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerUser, decodeRegistrationToken, setUserPassword } from '../api/api';

const { Title, Text } = Typography;

const StudentRegister = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [decodedData, setDecodedData] = useState(null);
    const [tokenError, setTokenError] = useState(false);
    const [checkingToken, setCheckingToken] = useState(true);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [fpLoading, setFpLoading] = useState(false);
    const submittingRef = useRef(false); // prevent duplicate submissions
    const [form] = Form.useForm();
    const [fpForm] = Form.useForm();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');

        if (!token) {
            setTokenError(true);
            setDecodedData(null);
            setCheckingToken(false);
            return;
        }

        // The link is single-use and short-lived, so it must be verified
        // against the server on every load — it can no longer be decoded
        // client-side (it's an opaque, server-tracked token now).
        decodeRegistrationToken(token)
            .then(({ data }) => {
                setDecodedData({ ...data.data, token });
                setTokenError(false);
            })
            .catch((error) => {
                console.error('Registration token invalid or expired', error);
                setTokenError(true);
                setDecodedData(null);
            })
            .finally(() => setCheckingToken(false));
    }, [location.search]);

    const onFinish = async (values) => {
        // Prevent duplicate submissions
        if (submittingRef.current) return;
        submittingRef.current = true;

        const payload = {
            name: values.name,
            email: values.email,
            password: values.password,
            token: decodedData?.token,
            consent_marketing: values.consent_marketing === true,
        };

        setLoading(true);
        try {
            await registerUser(payload);
            // Clear any existing session data before redirecting to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            message.success('Registration successful! You can now log in.');
            // Use replace to avoid returning to dashboard via back button
            navigate('/login', { replace: true });
        } catch (error) {
            message.error(error.response?.data?.message || 'Registration failed');
            submittingRef.current = false; // allow retry on error
        } finally {
            setLoading(false);
        }
    };

    const onForgotPassword = async (values) => {
        setFpLoading(true);
        try {
            await setUserPassword({ email: values.fpEmail, password: values.newPassword });
            message.success('Password updated successfully! You can now log in.');
            setShowForgotPassword(false);
            fpForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setFpLoading(false);
        }
    };

    // This block handles cases where a token was provided but was invalid/expired/already
    // used, or no token was provided at all. There's no manual fallback anymore — every
    // registration link is single-use and tied to one student, issued by the class rep.
    if (tokenError) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="fade-in" style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
                    <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                        <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>Student Registration</Title>
                        <Alert
                            type="warning"
                            showIcon
                            message={!location.search ? 'No registration token' : 'Invalid or expired registration link'}
                            description={
                                !location.search
                                    ? 'Get a registration link from your class representative to join your class.'
                                    : 'This link is invalid, expired, or has already been used. Ask your class rep for a new link.'
                            }
                            style={{ marginBottom: 24, textAlign: 'left' }}
                        />
                        <Button type="link" block onClick={() => navigate('/login')} style={{ marginTop: 8 }}>
                            Go to Login
                        </Button>
                    </Card>
                </div>
            </Layout>
        );
    }

    // Still resolving token with the server
    if (checkingToken) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Card className="glass-card" style={{ border: 'none' }}>
                    <Text>Loading...</Text>
                </Card>
            </Layout>
        );
    }

    // Valid token: show registration form
    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
                <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>Join Your Class</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        Register as a student for your class
                    </Text>

                    <Form
                        form={form}
                        name="register"
                        layout="vertical"
                        onFinish={onFinish}
                        size="large"
                    >
                        <Form.Item
                            name="name"
                            rules={[{ required: true, message: 'Please enter your full name' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Full name" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' },
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: 'Please enter a password' },
                                { min: 6, message: 'Password must be at least 6 characters' },
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                        </Form.Item>

                        <Form.Item name="consent_marketing" valuePropName="checked" initialValue={false}>
                            <label className="flex items-start gap-2 cursor-pointer text-left">
                                <input type="checkbox" className="mt-0.5 accent-green-600 w-4 h-4 flex-shrink-0" />
                                <span className="text-xs text-slate-500 leading-relaxed">
                                    I agree to receive marketing emails from Student Life (optional)
                                </span>
                            </label>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>
                                Register
                            </Button>
                        </Form.Item>
                    </Form>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Already have an account? <a href="/login">Log in</a>
                    </Text>
                    <div style={{ marginTop: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Forgot password?{' '}
                            <a onClick={() => setShowForgotPassword(!showForgotPassword)}>
                                Reset it
                            </a>
                        </Text>
                    </div>

                    {showForgotPassword && (
                        <div style={{ marginTop: 16, textAlign: 'left', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                            <Text strong style={{ fontSize: 13 }}>Reset Password</Text>
                            <Form
                                form={fpForm}
                                layout="vertical"
                                onFinish={onForgotPassword}
                                size="middle"
                                style={{ marginTop: 12 }}
                            >
                                <Form.Item
                                    name="fpEmail"
                                    rules={[
                                        { required: true, message: 'Enter your email' },
                                        { type: 'email', message: 'Invalid email' },
                                    ]}
                                >
                                    <Input prefix={<MailOutlined />} placeholder="Your email" />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    rules={[
                                        { required: true, message: 'Enter new password' },
                                        { min: 6, message: 'Min 6 characters' },
                                    ]}
                                >
                                    <Input.Password prefix={<LockOutlined />} placeholder="New password" />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" htmlType="submit" loading={fpLoading} block>
                                        Update Password
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    )}
                </Card>
            </div>
        </Layout>
    );
};

export default StudentRegister;

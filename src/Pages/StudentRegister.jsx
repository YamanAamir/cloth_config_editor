import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Layout, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Package } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/api';

const { Title, Text } = Typography;

const StudentRegister = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [decodedData, setDecodedData] = useState(null);
    const [tokenError, setTokenError] = useState(false);
    const [useManualCode, setUseManualCode] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const rawQuery = location.search.replace(/^\?/, '');
        const token = queryParams.get('token') || rawQuery;

        if (!token || token.length < 5) {
            setTokenError(true); // Keep tokenError for the "invalid link" message
            setDecodedData(null);
            setUseManualCode(true);
            return;
        }

        try {
            const jsonString = atob(token);
            const data = JSON.parse(jsonString);

            if (data.school_id != null && data.class_id != null) {
                setDecodedData({ ...data, token });
                setTokenError(false);
                setUseManualCode(false);
            } else {
                setTokenError(true);
                setDecodedData(null);
                setUseManualCode(true); // If token is invalid, allow manual code
            }
        } catch (error) {
            console.error('Failed to decode token', error);
            setTokenError(true);
            setDecodedData(null);
            setUseManualCode(true);
        }
    }, [location.search]);

    const onFinish = async (values) => {
        const payload = {
            name: values.name,
            email: values.email,
            password: values.password,
            school_id: decodedData?.school_id,
            class_id: decodedData?.class_id || values.classCode, // Support manual code
            token: decodedData?.token || 'manual',
        };

        setLoading(true);
        try {
            await registerUser(payload);
            message.success('Registration successful! You can now log in.');
            navigate('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // If tokenError is true AND we are not using manual code (meaning it was a bad token link)
    // OR if there's no decodedData and we're not using manual code (meaning still processing or no token at all)
    // This block handles cases where a token was provided but was invalid, or no token was provided and we're not yet in manual code mode.
    if (tokenError && !useManualCode) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="fade-in" style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
                    <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                        <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>Student Registration</Title>
                        <Alert
                            type="warning"
                            showIcon
                            message={!location.search ? 'No registration token' : 'Invalid registration link'}
                            description={
                                !location.search
                                    ? 'Get a registration link from your class representative to join your class.'
                                    : 'This link is invalid or expired. Ask your class rep for a new link, or enter your class code below.'
                            }
                            style={{ marginBottom: 24, textAlign: 'left' }}
                        />
                        <Button type="primary" block onClick={() => setUseManualCode(true)}>
                            Enter Class Code Manually
                        </Button>
                        <Button type="link" block onClick={() => navigate('/login')} style={{ marginTop: 8 }}>
                            Go to Login
                        </Button>
                    </Card>
                </div>
            </Layout>
        );
    }

    // Still resolving token (initial load with token) and not yet decided to use manual code
    if (location.search && decodedData === null && !tokenError && !useManualCode) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Card className="glass-card" style={{ border: 'none' }}>
                    <Text>Loading...</Text>
                </Card>
            </Layout>
        );
    }

    // Valid token or using manual code: show registration form
    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
                <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>Join Your Class</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        {useManualCode ? 'Enter your class code to register' : 'Register as a student for your class'}
                    </Text>

                    <Form
                        form={form}
                        name="register"
                        layout="vertical"
                        onFinish={onFinish}
                        size="large"
                    >
                        {useManualCode && (
                            <Form.Item
                                name="classCode"
                                rules={[{ required: true, message: 'Please enter your class code' }]}
                            >
                                <Input prefix={<Package className="w-4 h-4" />} placeholder="Class Code" />
                            </Form.Item>
                        )}

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

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>
                                Register
                            </Button>
                        </Form.Item>
                    </Form>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Already have an account? <a href="/login">Log in</a>
                    </Text>
                </Card>
            </div>
        </Layout>
    );
};

export default StudentRegister;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Select } from 'antd';
import { API_BASE_URL } from '../config/api.js';

const API_BASE = `${API_BASE_URL}/users`;
const CENTRES_API = `${API_BASE_URL}/centres/`;
const GROUPS_API = `${API_BASE_URL}/groups/`;

export default function AccessControl() {
    const [users, setUsers] = useState([]);
    const [centres, setCentres] = useState([]);
    const [allGroups, setAllGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCentres, setLoadingCentres] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const selectedCentreCode = Form.useWatch('center', form);

    // Fetch data on mount
    useEffect(() => {
        fetchUsers();
        fetchCentres();
        fetchGroups();
    }, []);

    // Filter groups whenever selected centre code or data changes
    useEffect(() => {
        if (selectedCentreCode && centres.length > 0) {
            const selectedCentre = centres.find(c => c.code === selectedCentreCode);
            if (selectedCentre) {
                const filtered = allGroups.filter(group => group.centre_id === selectedCentre.id);
                setFilteredGroups(filtered);
            } else {
                setFilteredGroups([]);
            }
        } else {
            setFilteredGroups([]);
        }
    }, [selectedCentreCode, centres, allGroups]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_BASE + '/');
            setUsers(response.data);
        } catch (error) {
            message.error('Failed to fetch users');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCentres = async () => {
        setLoadingCentres(true);
        try {
            const response = await axios.get(CENTRES_API);
            setCentres(response.data);
        } catch (error) {
            message.error('Failed to fetch centres');
            console.error(error);
        } finally {
            setLoadingCentres(false);
        }
    };

    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const response = await axios.get(GROUPS_API);
            setAllGroups(response.data);
        } catch (error) {
            message.error('Failed to fetch groups');
            console.error(error);
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        setFilteredGroups([]); // Clear groups when adding new
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingUser(record);
        form.setFieldsValue({
            name: record.name,
            email: record.email,
            role: record.role,
            center: record.center,     // centre code (string)
            group: record.group,       // group code (string)
            password: record.password,
        });

        // Manually filter groups for the edited user's centre
        const selectedCentre = centres.find(c => c.code === record.center);
        if (selectedCentre) {
            const filtered = allGroups.filter(group => group.centre_id === selectedCentre.id);
            setFilteredGroups(filtered);
        } else {
            setFilteredGroups([]);
        }

        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE}/${id}`);
            message.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            message.error('Failed to delete user');
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (editingUser) {
                await axios.put(`${API_BASE}/${editingUser.id}`, values);
                message.success('User updated successfully');
            } else {
                await axios.post(API_BASE + '/', values);
                message.success('User added successfully');
            }

            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            message.error('Operation failed');
            console.error(error);
        }
    };

    const columns = [
        { title: 'Sl No', key: 'slno', render: (_, __, index) => index + 1 },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Role', dataIndex: 'role', key: 'role' },
        { title: 'Centre', dataIndex: 'center', key: 'center' },
        { title: 'Group', dataIndex: 'group', key: 'group' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <span>
                    <Button type="link" onClick={() => handleEdit(record)}>
                        Edit
                    </Button>
                    <Popconfirm
                        title="Are you sure you want to delete this user?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" danger>
                            Delete
                        </Button>
                    </Popconfirm>
                </span>
            ),
        },
    ];

    const dataSource = users.map((user) => ({
        key: user.id,
        ...user,
    }));

    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
            <Button
                type="primary"
                onClick={handleAdd}
                style={{ marginBottom: 16 }}
            >
                Add New User
            </Button>

            <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                rowKey="id"
                bordered
                style={{ marginBottom: 24 }}
            />

            {/* Modal for Add/Edit */}
            <Modal
                title={editingUser ? 'Edit User' : 'Add New User'}
                open={isModalOpen}
                onOk={handleSubmit}
                onCancel={() => setIsModalOpen(false)}
                okText={editingUser ? 'Update' : 'Add'}
                destroyOnClose={false} // Keep form values if needed, but we reset manually
            >
                <Form form={form} layout="vertical" name="userForm">
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please enter name' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Invalid email format' },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select placeholder="Select a role">
                            <Select.Option value="admin">Admin</Select.Option>
                            <Select.Option value="GH">GH</Select.Option>
                            <Select.Option value="CH">CH</Select.Option>
                            <Select.Option value="Scientist">Scientist</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="center"
                        label="Centre"
                        rules={[{ required: true, message: 'Please select a centre' }]}
                    >
                        <Select
                            placeholder="Select a centre"
                            loading={loadingCentres}
                            showSearch
                            optionFilterProp="children"
                        >
                            {centres.map((centre) => (
                                <Select.Option key={centre.id} value={centre.code}>
                                    {centre.code} - {centre.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="group"
                        label="Group"
                        rules={[{message: 'Please select a group' }]}
                    >
                        <Select
                            placeholder="Select a group (based on centre)"
                            disabled={!selectedCentreCode} // Optional: disable until center selected
                            showSearch
                            optionFilterProp="children"
                        >
                            {filteredGroups.map((group) => (
                                <Select.Option key={group.id} value={group.code}>
                                    {group.code} - {group.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        initialValue="123456"
                        rules={[{ required: true, message: 'Please enter a password' }]}
                    >
                        <Input.Password placeholder="Please enter a password" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
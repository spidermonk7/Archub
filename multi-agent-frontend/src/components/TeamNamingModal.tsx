import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space } from 'antd';
import { TeamOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TeamNamingModalProps {
visible: boolean;
onCancel: () => void;
onConfirm: (name: string, description: string) => void;
defaultName?: string;
defaultDescription?: string;
nodeCount: number;
edgeCount: number;
}

const TeamNamingModal: React.FC<TeamNamingModalProps> = ({
visible,
onCancel,
onConfirm,
defaultName,
defaultDescription,
nodeCount,
edgeCount
}) => {
const [form] = Form.useForm();

// 生成默认值
const generateDefaults = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN').replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false
}).slice(0, 5);

    return {
    name: defaultName || `智能体团队-${dateStr}-${timeStr}`,
    description: defaultDescription || `一个包含 ${nodeCount} 个智能体和 
${edgeCount} 个连接的多功能团队`
    };
};

// 当弹窗打开时，设置默认值
useEffect(() => {
    if (visible) {
    const defaults = generateDefaults();
    form.setFieldsValue(defaults);
    }
}, [visible, nodeCount, edgeCount, form]);

const handleConfirm = () => {
    form.validateFields().then(values => {
    onConfirm(values.name.trim(), values.description.trim());
    form.resetFields();
    });
};

const handleCancel = () => {
    form.resetFields();
    onCancel();
};

return (
    <Modal
    title={
        <Space>
        <TeamOutlined style={{ color: '#1890ff' }} />
        为您的团队命名
        </Space>
    }
    open={visible}
    onCancel={handleCancel}
    footer={null}
    width={600}
    centered
    destroyOnClose
    >
    <div style={{ padding: '20px 0' }}>
        <Title level={4} style={{ marginBottom: '16px', color: '#666' }}>
        <EditOutlined /> 请为新创建的智能体团队设置名称和描述
        </Title>

        <Form
        form={form}
        layout="vertical"
        onFinish={handleConfirm}
        >
        <Form.Item
            name="name"
            label="团队名称"
            rules={[
            { required: true, message: '请输入团队名称' },
            { max: 50, message: '团队名称不能超过50个字符' }
            ]}
        >
            <Input
            placeholder="请输入团队名称..."
            showCount
            maxLength={50}
            />
        </Form.Item>

        <Form.Item
            name="description"
            label="团队描述"
            rules={[
            { required: true, message: '请输入团队描述' },
            { max: 200, message: '团队描述不能超过200个字符' }
            ]}
        >
            <TextArea
            placeholder="请描述这个团队的功能和用途..."
            rows={4}
            showCount
            maxLength={200}
            />
        </Form.Item>

        <div style={{ 
            background: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '6px',
            marginBottom: '24px'
        }}>
            <Text type="secondary">
            💡
提示：您可以直接使用默认值，或者自定义更符合团队特色的名称和描述
            </Text>
        </div>

        <div style={{ textAlign: 'right' }}>
            <Space>
            <Button onClick={handleCancel}>
                取消
            </Button>
            <Button type="primary" htmlType="submit">
                确认创建
            </Button>
            </Space>
        </div>
        </Form>
    </div>
    </Modal>
);
};

export default TeamNamingModal;
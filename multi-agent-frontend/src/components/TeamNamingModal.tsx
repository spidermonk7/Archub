import React, { useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Tag } from 'antd';
import { TeamOutlined, EditOutlined } from '@ant-design/icons';
import './TeamNamingModal.css';

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
  edgeCount,
}) => {
  const [form] = Form.useForm();

  const generateDefaults = useCallback(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    return {
      name: defaultName || `Autonomous Team ${dateStr}-${timeStr}`,
      description:
        defaultDescription ||
        `An intelligent workflow featuring ${nodeCount} node${nodeCount === 1 ? '' : 's'} and ${edgeCount} connection${edgeCount === 1 ? '' : 's'}.`,
    };
  }, [defaultName, defaultDescription, nodeCount, edgeCount]);

  useEffect(() => {
    if (visible) {
      const defaults = generateDefaults();
      form.setFieldsValue(defaults);
    }
  }, [visible, form, generateDefaults]);

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
      className="team-naming-modal"
      title={
        <Space align="center" size="middle">
          <TeamOutlined className="team-naming-icon" />
          Name Your Team
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={620}
      centered
      destroyOnClose
    >
      <div className="team-naming-body">
        <div className="team-naming-intro">
          <Title level={4}>Craft a memorable identity</Title>
          <Text type="secondary">
            Highlight what this workflow excels at. Your team will appear in Team Pool as soon as you save it.
          </Text>
          <div className="team-naming-stats">
            <Tag>{nodeCount} nodes</Tag>
            <Tag>{edgeCount} connections</Tag>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleConfirm}
          className="team-naming-form"
        >
          <Form.Item
            name="name"
            label="Team name"
            rules={[
              { required: true, message: 'Please provide a team name.' },
              { max: 50, message: 'Team name cannot exceed 50 characters.' },
            ]}
          >
            <Input
              placeholder="e.g. Research Orchestrator"
              showCount
              maxLength={50}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Short description"
            rules={[
              { required: true, message: 'Please describe what the team does.' },
              { max: 200, message: 'Description cannot exceed 200 characters.' },
            ]}
          >
            <TextArea
              placeholder="Summarize the use case, persona, or output expectations."
              rows={4}
              showCount
              maxLength={200}
            />
          </Form.Item>

          <div className="team-naming-hint">
            <EditOutlined />
            <Text type="secondary">
              Pro tip: mention the primary task or target user so teammates can spot the right workflow instantly.
            </Text>
          </div>

          <div className="team-naming-actions">
            <Space size="middle">
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save team
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default TeamNamingModal;

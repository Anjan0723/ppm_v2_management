import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
  DatePicker,
  Select,
  Row,
  Col,
} from 'antd'

import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

import '../App.css'
import { API_BASE_URL } from '../config/api.js'
import { formatDate } from '../config/date.js'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)


const AcknowledgeProposalsTable = ({ fetchProposalsTrigger }) => {
  const [pendingProposals, setPendingProposals] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  // Document modal state
  const [stageConfig, setStageConfig] = useState([])
  const [docsModalVisible, setDocsModalVisible] = useState(false)
  const [projectDocs, setProjectDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [viewDocumentUrl, setViewDocumentUrl] = useState(null)

  const fetchPendingProposals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/proposals/false`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to fetch pending proposals')
      const data = await response.json()
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, key: item.id }))
        : []

      // Fetch all documents to compute per-proposal document counts
      try {
        const docsRes = await fetch(`${API_BASE_URL}/documents/`, {
          headers: { accept: 'application/json' },
        })
        if (docsRes.ok) {
          const allDocs = await docsRes.json()
          const docsByProject = {}
            ; (Array.isArray(allDocs) ? allDocs : []).forEach((d) => {
              const pid = d.project_id
              if (pid != null) docsByProject[pid] = (docsByProject[pid] || 0) + 1
            })
          normalized.forEach((item) => {
            item._docCount = docsByProject[item.id] || 0
          })
        }
      } catch (docErr) {
        console.error('Failed to fetch document counts:', docErr)
      }

      setPendingProposals(normalized)
    } catch (error) {
      console.error(error)
      message.error('Unable to fetch pending proposals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingProposals()
    fetchStageConfig()
  }, [fetchPendingProposals])

  const fetchStageConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/stages/`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to fetch stage configuration')
      const data = await res.json()
      setStageConfig(Array.isArray(data) ? data.map((item) => ({ ...item, key: item.id })) : [])
    } catch (error) {
      console.error('Error fetching stage configuration:', error)
    }
  }, [])

  const fetchProjectDocuments = useCallback(async (projectId) => {
    setDocsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/documents/`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      const docs = Array.isArray(data) ? data : []

      const enquiryStage = stageConfig.find(
        (s) => (s.name || '').toString().trim().toLowerCase() === 'enquiry',
      )
      const enquiryStageId = enquiryStage?.id

      const filtered = docs
        .filter((d) => d.project_id === projectId)
        .filter((d) => (enquiryStageId ? d.stage_id === enquiryStageId : true))

      const baseName = (enquiryStage?.name || 'Enquiry').toString().trim() || 'Enquiry'

      const sortedByDate = [...filtered].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      )

      const withVersions = sortedByDate.map((d, idx) => ({
        ...d,
        version: idx + 1,
        display_name: d.name || `${baseName} v${idx + 1}`,
      }))

      setProjectDocs(withVersions)
    } catch (err) {
      console.error('Error fetching project documents:', err)
      message.error(err.message || 'Unable to load documents')
      setProjectDocs([])
    } finally {
      setDocsLoading(false)
    }
  }, [stageConfig])

  const openDocsModal = useCallback(async (projectId) => {
    setDocsModalVisible(true)
    await fetchProjectDocuments(projectId)
  }, [fetchProjectDocuments])

  const viewDocument = useCallback((doc) => {
    if (!doc?.url) {
      return message.error('Document URL is not available')
    }
    setViewDocumentUrl(doc.url)
  }, [])

  // Refresh when master proposals are updated (optional sync)
  useEffect(() => {
    fetchPendingProposals()
  }, [fetchProposalsTrigger])

  const handleAcknowledge = async (id, acknowledge = true) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`${API_BASE_URL}/proposals/acknowledge/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_acknowledged: acknowledge }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(err || 'Failed to update acknowledgement')
      }

      message.success(acknowledge ? 'Proposal accepted' : 'Proposal rejected')
      fetchPendingProposals()  // Refresh pending list
      fetchProposalsTrigger()  // Refresh master proposals if needed
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Failed to update acknowledgement')
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const pendingColumns = [
 
    { title: 'Enquiry Date', dataIndex: 'enquiry_date', key: 'enquiry_date', width: 120,
        render: (text) => formatDate(text) },

    { title: 'Customer Type', dataIndex: 'customer_type', key: 'customer_type' , width: 120,},
    { title: 'Customer Name', dataIndex: 'customer_name', key: 'customer_name', width: 120, },
    { title: 'Address', dataIndex: 'address', key: 'address', width: 120, },
    { title: 'Email', dataIndex: 'email', key: 'email' , width: 120,},
    { title: 'Phone No', dataIndex: 'phone_no', key: 'phone_no' , width: 120,},
    { title: 'Alternate Contact Details', dataIndex: 'alternate_contact_details', key: 'alternate_contact_details', width: 120, },

    { title: 'Request Type', dataIndex: 'request_type', key: 'request_type' , width: 120,},
    { title: 'Email Reference', dataIndex: 'email_reference', key: 'email_reference' , width: 120,},
    { title: 'Quote Reference', dataIndex: 'quote_reference', key: 'quote_reference', width: 120, },

    { title: 'Quote Description', dataIndex: 'quote_description', key: 'quote_description', width: 120, },

    { title: 'Quote Date', dataIndex: 'quote_date', key: 'quote_date',
        render: (text) => formatDate(text), width: 120, },
    { title: 'Quote Amount', dataIndex: 'quote_amount', key: 'quote_amount', width: 120, },

    { title: 'Revised/Negotiated', dataIndex: 'revised/negotiated', key: 'revised/negotiated' , width: 120,},
    { title: 'Revised/Negotiated Quote Date', dataIndex: 'revised/negotiated_quote_date', key: 'revised/negotiated_quote_date',
        render: (text) => formatDate(text) , width: 120,},
    { title: 'Revised/Negotiated Quote Amount', dataIndex: 'revised/negotiated_quote_amount', key: 'revised/negotiated_quote_amount', width: 120, },

    { title: 'Quotation By', dataIndex: 'quotation_given_by_name', key: 'quotation_given_by_name' , width: 120,},
    { title: 'Department', dataIndex: 'quotation_given_by_department', key: 'quotation_given_by_department' , width: 120,},

    {
      key: 'enquiry_documents',
      title: 'Enquiry Documents',
      width: 160,
      render: (_, record) => {
        const count = record._docCount
        if (count === undefined) return <span style={{ color: '#999' }}>-</span>
        if (count > 0) {
          return (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDocsModal(record.id)}>
              View ({count})
            </Button>
          )
        }
        return <span style={{ color: '#999' }}>No documents</span>
      },
    },

    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
       width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            loading={actionLoading[record.id]}
            onClick={() => handleAcknowledge(record.id, true)}
          >
            Accept
          </Button>
          <Popconfirm
            title="Reject this proposal?"
            description="This will acknowledge it as rejected."
            onConfirm={() => handleAcknowledge(record.id, false)}
            okText="Reject"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              loading={actionLoading[record.id]}
            >
              Reject
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="overflow-x-auto">
      <Table
        rowKey="key"
        columns={pendingColumns}
        dataSource={pendingProposals}
        loading={loading}
        pagination={{ pageSize: 15 }}
        bordered
        scroll={{ x: 1600, y: 500 }}
        sticky
        locale={{ emptyText: 'No pending proposals to acknowledge' }}
      />

      {/* Uploaded Documents (Version List) Modal */}
      <Modal
        title="Uploaded Enquiry Documents"
        open={docsModalVisible}
        onCancel={() => setDocsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDocsModalVisible(false)}>Close</Button>,
        ]}
        width={700}
        maskClosable={false}
      >
        <Table
          rowKey="id"
          dataSource={projectDocs}
          loading={docsLoading}
          pagination={false}
          columns={[
            {
              title: 'Version',
              dataIndex: 'version',
              key: 'version',
              width: 80,
              render: (v) => (v ? `v${v}` : '-'),
            },
            {
              title: 'Name',
              dataIndex: 'display_name',
              key: 'name',
            },
            {
              title: 'Uploaded By',
              dataIndex: 'uploaded_by',
              key: 'uploaded_by',
              width: 150,
            },
            {
              title: 'Uploaded At',
              dataIndex: 'created_at',
              key: 'created_at',
              width: 180,
              render: (value) => (value ? dayjs(value).format('DD.MM.YYYY HH:mm') : '-'),
            },
            {
              title: 'View',
              key: 'view',
              width: 80,
              render: (_, record) => (
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => viewDocument(record)}
                />
              ),
            },
          ]}
        />
        {(!docsLoading && !projectDocs.length) && (
          <div className="text-center text-gray-500 mt-4">No documents uploaded yet.</div>
        )}
      </Modal>

      <Modal
        title="Document Viewer"
        open={!!viewDocumentUrl}
        onCancel={() => setViewDocumentUrl(null)}
        footer={null}
        width={1100}
      >
        <iframe src={viewDocumentUrl || ''} className="w-full h-[80vh]" title="Document" />
      </Modal>
    </div>
  )
}


export default AcknowledgeProposalsTable;
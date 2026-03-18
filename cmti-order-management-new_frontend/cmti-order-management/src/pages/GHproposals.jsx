import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  EditOutlined,
  InboxOutlined,
  UploadOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Descriptions,
  Typography,
  message,
  DatePicker,
  Select,
  Card,
  Row,
  Col,
  Statistic,
  AutoComplete,
  Upload,
} from 'antd'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import '../App.css'
import { API_BASE_URL } from '../config/api.js'
import { DISPLAY_DATE_FORMAT, formatDate, formatIndianNumber } from '../config/date.js'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const { Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker
const { Dragger } = Upload

const CUSTOMER_TYPE_OPTIONS = [
  'Govt',
  'Private',
  'MHI',
  'MSME',
  'Research Institute',
  'Educational institute',
]

const REQUEST_TYPE_OPTIONS = [
  'Call for Proposal',
  'Mail',
  'Discussion',
  'Initiative',
  'Tender',
  'Direct Enquiry',
  'Budgetry offer',
  'EOI',
]

const PROPOSAL_FIELDS = [
  { name: 'id', label: 'SL NO', width: 120, inForm: false, render: (text, record, index) => index + 1 },
  { name: 'enquiry_date', label: 'Enquiry Date', width: 150 },
  { name: 'customer_type', label: 'Customer Type', width: 170 },
  { name: 'customer_name', label: 'Customer Name', width: 170 },
  { name: 'address', label: 'Address', width: 240 },
  { name: 'email', label: 'Email', width: 200 },
  { name: 'phone_no', label: 'Phone No.', width: 150 },
  { name: 'alternate_contact_details', label: 'Alternate Contact', width: 220 },
  {
    name: 'request_type',
    label: 'Request Type',
    width: 160,
    render: (value) => (value ? <Tag color="blue">{value}</Tag> : null),
  },
  { name: 'email_reference', label: 'Email Reference', width: 200 },
  { name: 'quote_reference', label: 'Quote Reference', width: 190 },
  { name: 'quote_description', label: 'Quote Description', width: 240, input: 'textarea' },
  { name: 'quote_date', label: 'Quote Date', width: 140 },
  { name: 'quote_amount', label: 'Quote Amount', width: 160 },
  { name: 'revised_negotiated', label: 'Revised / Negotiated', width: 190, apiName: 'revised/negotiated' },
  { name: 'revised_negotiated_quote_date', label: 'Revised Quote Date', width: 190, apiName: 'revised/negotiated_quote_date' },
  { name: 'revised_negotiated_quote_amount', label: 'Revised Quote Amount', width: 210, apiName: 'revised/negotiated_quote_amount' },
  { name: 'quotation_given_by_department', label: 'Department', width: 180 },
  { name: 'quotation_given_by_name', label: 'Propsal Given By', width: 200 },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'party_name', label: 'Party Name', width: 200 },
  { name: 'activity', label: 'Activity', width: 160 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 240, input: 'textarea' },
  { name: 'order_number', label: 'Order Number', width: 150 },
  { name: 'order_date', label: 'Order Date', width: 150 },
  { name: 'delivery_date', label: 'Delivery Date', width: 160 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 190 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 210 },
  { name: 'order_value', label: 'Order Value', width: 170 },
  { name: 'details_of_external_internal_review_meeting', label: 'Review Meeting Details', width: 260, input: 'textarea' },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 200 },
  { name: 'center', label: 'Centre', width: 150 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closure Report', width: 200, input: 'textarea' },
  { name: 'technical_completed_year', label: 'Technical Completion Year', width: 220 },
  { name: 'financial_completed_year', label: 'Financial Completion Year', width: 220 },
  { name: 'status', label: 'Status', width: 150, input: 'select' },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 160 },
  { name: 'ppm_remarks', label: 'PPM Remarks', width: 200, input: 'textarea' },
  { name: 'created_at', label: 'Created At', width: 190, inForm: false },
  { name: 'updated_at', label: 'Updated At', width: 190, inForm: false },
  { name: 'updated_by', label: 'Updated By', width: 150, required: true },
  { name: 'group', label: 'Group', width: 150 },
]

// Fields required for the coordinator add endpoint
const COORDINATOR_ADD_FIELDS = [
  'enquiry_date',
  'customer_type',
  'customer_name',
  'address',
  'email',
  'phone_no',
  'alternate_contact_details',
  'request_type',
  'email_reference',
  //mychanges
  // 'quote_reference',
  // 'quote_description',
  // 'quote_date',
  // 'quote_amount',
  // 'revised_negotiated',
  // 'revised_negotiated_quote_date',
  // 'revised_negotiated_quote_amount',
  'quotation_given_by_name',
  'quotation_given_by_department',
  'center',
  'group',
]

// Restricted columns for GH/CH (operational view - no quotation, no payment, no metadata)
const TABLE_FIELDS = [
  { name: 'id', label: 'SL NO', width: 80, render: (text, record, index) => index + 1 },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'customer_name', label: 'Customer Name', width: 180 },
  { name: 'order_date', label: 'Order Date', width: 130 },
  { name: 'delivery_date', label: 'Delivery Date', width: 140 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 150 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 170 },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 130 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 220, input: 'textarea' },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 180 },
  { name: 'center', label: 'Centre', width: 120 },
  { name: 'group', label: 'Group', width: 120 },
  { name: 'status', label: 'Status', width: 130, input: 'select' },
  { name: 'technical_completed_year', label: 'Technical Completion', width: 160 },
  { name: 'financial_completed_year', label: 'Financial Completion', width: 160 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closure Report', width: 180, input: 'textarea' },
]

// All fields for data mapping (internal use)
const ALL_FIELDS = [
  { name: 'id', label: 'SL NO', width: 120, inForm: false },
  { name: 'enquiry_date', label: 'Enquiry Date', width: 150 },
  { name: 'customer_type', label: 'Customer Type', width: 170 },
  { name: 'customer_name', label: 'Customer Name', width: 170 },
  { name: 'address', label: 'Address', width: 240 },
  { name: 'email', label: 'Email', width: 200 },
  { name: 'phone_no', label: 'Phone No.', width: 150 },
  { name: 'alternate_contact_details', label: 'Alternate Contact', width: 220 },
  { name: 'request_type', label: 'Request Type', width: 160, render: (value) => (value ? <Tag color="blue">{value}</Tag> : null) },
  { name: 'email_reference', label: 'Email Reference', width: 200 },
  { name: 'quote_reference', label: 'Quote Reference', width: 190 },
  { name: 'quote_description', label: 'Quote Description', width: 240, input: 'textarea' },
  { name: 'quote_date', label: 'Quote Date', width: 140 },
  { name: 'quote_amount', label: 'Quote Amount', width: 160 },
  { name: 'revised_negotiated', label: 'Revised / Negotiated', width: 190, apiName: 'revised/negotiated' },
  { name: 'revised_negotiated_quote_date', label: 'Revised Quote Date', width: 190, apiName: 'revised/negotiated_quote_date' },
  { name: 'revised_negotiated_quote_amount', label: 'Revised Quote Amount', width: 210, apiName: 'revised/negotiated_quote_amount' },
  { name: 'quotation_given_by_department', label: 'Department', width: 180 },
  { name: 'quotation_given_by_name', label: 'Quotation Given By', width: 200 },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'party_name', label: 'Party Name', width: 200 },
  { name: 'activity', label: 'Activity', width: 160 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 240, input: 'textarea' },
  { name: 'order_number', label: 'Order Number', width: 150 },
  { name: 'order_date', label: 'Order Date', width: 150 },
  { name: 'delivery_date', label: 'Delivery Date', width: 160 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 190 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 210 },
  { name: 'order_value', label: 'Order Value', width: 170 },
  { name: 'details_of_external_internal_review_meeting', label: 'Review Meeting Details', width: 260, input: 'textarea' },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 200 },
  { name: 'center', label: 'Centre', width: 150 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closure Report', width: 200, input: 'textarea' },
  { name: 'technical_completed_year', label: 'Technical Completion Year', width: 220 },
  { name: 'financial_completed_year', label: 'Financial Completion Year', width: 220 },
  { name: 'status', label: 'Status', width: 150, input: 'select' },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 160 },
  { name: 'ppm_remarks', label: 'PPM Remarks', width: 200, input: 'textarea' },
  { name: 'created_at', label: 'Created At', width: 190, inForm: false },
  { name: 'updated_at', label: 'Updated At', width: 190, inForm: false },
  { name: 'updated_by', label: 'Updated By', width: 150, required: true },
  { name: 'group', label: 'Group', width: 150 },
]

const getApiName = (name) => {
  const field = ALL_FIELDS.find((item) => item.name === name)
  return field?.apiName ?? name
}

const uniqueKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const mapApiToUi = (record) => {
  const mapped = {}
  ALL_FIELDS.forEach((field) => {
    const apiName = getApiName(field.name)
    mapped[field.name] = record?.[apiName] ?? ''
  })
  mapped.key = record?.id ?? uniqueKey()
  return mapped
}

const mapUiToApi = (values) => {
  const payload = {}
  COORDINATOR_ADD_FIELDS.forEach((fieldName) => {
    const apiName = getApiName(fieldName)
    payload[apiName] = values[fieldName] ?? ''
  })
  return payload
}

const getDocumentVersionNumber = (name, baseName) => {
  const n = (name || '').toString().trim()
  const b = (baseName || '').toString().trim()
  if (!n || !b) return null
  const lower = n.toLowerCase()
  const baseLower = b.toLowerCase()
  if (!lower.startsWith(baseLower)) return null
  const match = lower.match(/\bv\s*(\d+)\b/)
  if (!match) return null
  const num = Number(match[1])
  return Number.isFinite(num) ? num : null
}

const getNextDocumentVersion = (docs, baseName) => {
  const list = Array.isArray(docs) ? docs : []
  const versions = list
    .map((d) => getDocumentVersionNumber(d?.name, baseName))
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
  const max = versions.length ? Math.max(...versions) : 0
  return max + 1
}

function Proposals() {
  const [form] = Form.useForm() // For existing edit modal (if any)
  const [coordinatorForm] = Form.useForm() // For new Add Proposal modal

  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [coordinatorSubmitLoading, setCoordinatorSubmitLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [centerFilter, setCentreFilter] = useState(null)
  const [orderDateRange, setOrderDateRange] = useState(null)
  const [enquiryDateRange, setEnquiryDateRange] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [projectCodePrefix, setProjectCodePrefix] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserCentre, setCurrentUserCentre] = useState('')
  const [currentUserGroup, setCurrentUserGroup] = useState('')
  const [proposalCount, setProposalCount] = useState(0)
  const [customerOptions, setCustomerOptions] = useState([])
  const [allCustomerSuggestions, setAllCustomerSuggestions] = useState([])
  const [addressOptions, setAddressOptions] = useState([])
  const [emailOptions, setEmailOptions] = useState([])
  const [phoneOptions, setPhoneOptions] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)

  // Unacknowledged proposals state
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [showUnacknowledgedOnly, setShowUnacknowledgedOnly] = useState(false)
  const [originalTableData, setOriginalTableData] = useState([])

  // Upload documents immediately after proposal creation (needs project_id)
  const [stageConfig, setStageConfig] = useState([])
  const [createdProjectId, setCreatedProjectId] = useState(null)
  const [createdProjectStages, setCreatedProjectStages] = useState([])
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [uploadStageId, setUploadStageId] = useState(1) // default Enquiry
  const [selectedStageForUpload, setSelectedStageForUpload] = useState(null)
  const [fileToUpload, setFileToUpload] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [documentName, setDocumentName] = useState('Enquiry v1')
  const [description, setDescription] = useState('')
  const [uploadedBy, setUploadedBy] = useState('')
  const [docsModalVisible, setDocsModalVisible] = useState(false)
  const [projectDocs, setProjectDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [viewDocumentUrl, setViewDocumentUrl] = useState(null)

  const openDetailModal = useCallback((record) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }, [])

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedRecord(null)
  }, [])

  const openEditModal = useCallback(
    (record) => {
      if (!record) return
      setEditingRecord(record)
      form.resetFields()
      form.setFieldsValue({
        ...record,
        updated_by: currentUserName || record.updated_by,
      })
      setModalOpen(true)
    },
    [form, currentUserName],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }, [form])

  const handleCloseUploadModal = () => {
    setUploadModalVisible(false)
    setFileToUpload(null)
  }

  const handleUpload = async () => {
    if (!fileToUpload) return message.error('Please select a file')
    const uploader = (uploadedBy || currentUserName || '').trim()
    if (!uploader) return message.error('Your name is required')
    if (!createdProjectId) return message.error('Project ID not available. Please create a proposal first.')

    setUploading(true)
    const formData = new FormData()
    formData.append('name', documentName.trim())
    formData.append('description', description.trim())
    formData.append('project_id', createdProjectId)
    formData.append('stage_id', selectedStageForUpload?.stage_id || uploadStageId)
    formData.append('uploaded_by', uploader)
    formData.append('file', fileToUpload)

    try {
      const res = await fetch(`${API_BASE_URL}/documents/`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.text().catch(() => 'Upload failed')
        throw new Error(err || 'Upload failed')
      }
      message.success('Document uploaded!')

      // Update uploaded docs list; set next default version label
      setFileToUpload(null)
      const baseName = (selectedStageForUpload?.stage_name || 'Enquiry').toString().trim() || 'Enquiry'
      const docs = await fetchProjectDocuments(createdProjectId)
      const nextVersion = (Array.isArray(docs) ? docs.length : 0) + 1
      setDocumentName(`${baseName} v${nextVersion}`)
    } catch (err) {
      console.error('Upload error:', err)
      message.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (values) => {
    if (!editingRecord?.id) {
      message.error('No record selected for editing')
      return
    }

    setSubmitLoading(true)
    
    // Build payload for coordinator-update endpoint (only allowed fields)
    const payload = {
      project_id: editingRecord.id,
      extended_delivery_date: values.extended_delivery_date || '',
      co_ordinator_remarks: values.co_ordinator_remarks || '',
      technical_completed_year: values.technical_completed_year || null,
      updated_by: values.updated_by || currentUserName || '',
    }

    try {
      const response = await fetch(`${API_BASE_URL}/proposals/coordinator-update`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to update proposal')
      }

      message.success('Proposal updated successfully')
      closeModal()
      await fetchProposals()
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to update proposal')
    } finally {
      setSubmitLoading(false)
    }
  }

  const fetchProposals = useCallback(async () => {
    setTableLoading(true)
    try {
      let url = `${API_BASE_URL}/proposals/`
      let coordinatorName = ''

      try {
        const rawUser = window.localStorage.getItem('ppm_user')
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser)
          if (parsedUser && parsedUser.name) {
            coordinatorName = parsedUser.name
            setCurrentUserName(parsedUser.name)
            setCurrentUserCentre(parsedUser.center || '')
            setCurrentUserGroup(parsedUser.group || '')
            const encodedName = encodeURIComponent(parsedUser.name)
            url = `${API_BASE_URL}/proposals/by-name/${encodedName}`
          }
        }
      } catch (storageError) {
        console.error('Failed to read user from localStorage', storageError)
      }

      const response = await fetch(url, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Unable to fetch proposals')
      const payload = await response.json()
      const normalized = Array.isArray(payload) ? payload.map(mapApiToUi) : []

      setTableData(normalized)
      setFilteredData(normalized)
      setOriginalTableData(normalized)
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to fetch proposals')
    } finally {
      setTableLoading(false)
    }
  }, [])

  const fetchProposalsCount = async () => {
    try {
      let count = 0
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        const group = (parsedUser?.group || '').toString().trim()
        if (group) {
          const encodedGroup = encodeURIComponent(group)
          const url = `${API_BASE_URL}/proposals/count/by-group/${encodedGroup}`
          const response = await fetch(url, { headers: { accept: 'application/json' } })
          if (response.ok) {
            const payload = await response.json()
            count = payload?.count ?? 0
          }
        }
      }
      setProposalCount(count)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchUnacknowledgedCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/proposals/unacknowledged`, {
        headers: { accept: 'application/json' },
      })
      if (response.ok) {
        const data = await response.json()
        const count = Array.isArray(data) ? data.length : 0
        setUnacknowledgedCount(count)
      }
    } catch (error) {
      console.error('Failed to fetch unacknowledged count:', error)
    }
  }

  const fetchUnacknowledgedProposals = async () => {
    setTableLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/proposals/unacknowledged`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Unable to fetch unacknowledged proposals')
      const payload = await response.json()
      const normalized = Array.isArray(payload) ? payload.map(mapApiToUi) : []
      setTableData(normalized)
      setFilteredData(normalized)
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to fetch unacknowledged proposals')
    } finally {
      setTableLoading(false)
    }
  }

  const handleUnacknowledgedToggle = () => {
    if (showUnacknowledgedOnly) {
      // Restore normal view
      setShowUnacknowledgedOnly(false)
      setTableData(originalTableData)
      setFilteredData(originalTableData)
      fetchProposals()
    } else {
      if (!unacknowledgedCount) {
        message.info('No unacknowledged proposals')
        return
      }
      // Show unacknowledged only
      setShowUnacknowledgedOnly(true)
      fetchUnacknowledgedProposals()
    }
  }

  const fetchStageConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/stages/`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch stage configuration')
      }
      const data = await res.json()
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, key: item.id }))
        : []
      setStageConfig(normalized)
      return normalized
    } catch (error) {
      console.error('Error fetching stage configuration:', error)
      return []
    }
  }

  const openUploadModalForNewProposal = (projectId) => {
    const stages = Array.isArray(stageConfig) ? stageConfig : []
    const enquiryStage = stages.find((s) => (s.name || '').toString().trim().toLowerCase() === 'enquiry')
    const stage = enquiryStage || stages[0] || { id: uploadStageId, name: 'Enquiry' }

    setSelectedStageForUpload({ stage_id: stage.id, stage_name: stage.name || 'Enquiry' })
    setUploadStageId(stage.id)

    const baseName = (stage.name || 'Enquiry').toString().trim() || 'Enquiry'
    setDocumentName(`${baseName} v1`)
    setUploadedBy(currentUserName || '')
    setDescription('')

    setCreatedProjectId(projectId)
    setUploadModalVisible(true)
  }

  const fetchProjectDocuments = async (projectId) => {
    setDocsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/documents/`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch documents')
      }
      const data = await res.json()
      const docs = Array.isArray(data) ? data : []

      const enquiryStage = (Array.isArray(stageConfig) ? stageConfig : []).find(
        (s) => (s.name || '').toString().trim().toLowerCase() === 'enquiry',
      )
      const enquiryStageId = enquiryStage?.id

      const filtered = docs
        .filter((d) => d.project_id === projectId)
        .filter((d) => (enquiryStageId ? d.stage_id === enquiryStageId : true))

      const baseName = (enquiryStage?.name || 'Enquiry').toString().trim() || 'Enquiry'

      // Sort by uploaded time (oldest first) and assign sequential version numbers
      const sortedByDate = [...filtered].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      )

      const withVersions = sortedByDate.map((d, idx) => ({
        ...d,
        version: idx + 1,
        display_name: d.name || `${baseName} v${idx + 1}`,
      }))

      setProjectDocs(withVersions)
      return withVersions
    } catch (err) {
      console.error('Error fetching project documents:', err)
      message.error(err.message || 'Unable to load documents')
      setProjectDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  const openDocsModal = async (projectId) => {
    setDocsModalVisible(true)
    await fetchProjectDocuments(projectId)
  }

  const viewDocument = (doc) => {
    if (!doc?.url) {
      return message.error('Document URL is not available')
    }

    setViewDocumentUrl(doc.url)
  }

  useEffect(() => {
    // Trigger delivery notification check on every page load
    fetch(`${API_BASE_URL}/proposals/check-delivery-notifications`, {
      method: 'POST',
      headers: { accept: 'application/json' },
    }).catch(err => console.log('Notification check error:', err))

    fetchProposals()
    fetchProposalsCount()
    fetchStageConfig()
    fetchUnacknowledgedCount()
  }, [fetchProposals])

  useEffect(() => {
    if (!detailModalOpen) return
    if (!selectedRecord?.id) return
    fetchProjectDocuments(selectedRecord.id)
  }, [detailModalOpen, selectedRecord])

  // Open/Close Coordinator Add Modal
  const openCoordinatorAddModal = () => {
    coordinatorForm.resetFields()
    setCustomerOptions([])
    setAddressOptions([])
    setEmailOptions([])
    setPhoneOptions([])

    // Auto-fill read-only fields including group and center
    if (currentUserName) {
      coordinatorForm.setFieldsValue({
        quotation_given_by_name: currentUserName,
        quotation_given_by_department: currentUserCentre ? currentUserCentre.toUpperCase() : '',
        center: currentUserCentre || '',
        group: currentUserGroup || '',
      })
    }

    setCoordinatorModalOpen(true)
  }

  const closeCoordinatorModal = () => {
    setCoordinatorModalOpen(false)
    coordinatorForm.resetFields()
    setCustomerOptions([])
    setAddressOptions([])
    setEmailOptions([])
    setPhoneOptions([])
  }

  const fetchCustomerSuggestions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Unable to fetch customer suggestions')
      }
      const payload = await response.json()
      const normalized = Array.isArray(payload) ? payload.map(customer => ({
        name: customer.name,
        customer_type: customer.customer_type,
        address: null,
        email: customer.email,
        phone_no: customer.phone_no,
        alternate_contact_details: customer.alternate_contact_details,
        addresses: customer.address ? [customer.address] : []
      })).filter(c => c.name && c.name.trim()) : []
      setAllCustomerSuggestions(normalized)
      return normalized
    } catch (error) {
      console.error('Customer suggestions fetch error:', error)
      setAllCustomerSuggestions([])
      return []
    }
  }, [])

  const searchCustomers = useCallback(async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setCustomerOptions([])
      return
    }

    setCustomerSearchLoading(true)
    try {
      const normalized = searchValue.trim().toLowerCase()

      // Ensure we have the full list fetched
      let customerList = allCustomerSuggestions
      if (!customerList.length) {
        customerList = await fetchCustomerSuggestions()
      }

      const matches = (customerList || [])
        .filter((c) => c?.name?.toLowerCase().includes(normalized))
        .slice(0, 20)

      const options = matches.map((customer) => ({
        value: customer.name,
        label: `${customer.name} ${customer.customer_type ? `(${customer.customer_type})` : ''}`,
        customer,
      }))
      setCustomerOptions(options)
    } finally {
      setCustomerSearchLoading(false)
    }
  }, [allCustomerSuggestions, fetchCustomerSuggestions])

  const searchAddresses = useCallback(
    async (searchValue) => {
      if (!searchValue || !searchValue.trim()) {
        setAddressOptions([])
        return
      }

      const currentName = coordinatorForm.getFieldValue('customer_name')?.trim()
      if (!currentName) {
        setAddressOptions([])
        return
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/customers/addresses?name=${encodeURIComponent(currentName)}`,
          { headers: { accept: 'application/json' } },
        )
        if (!response.ok) throw new Error('Unable to fetch addresses')
        const payload = await response.json()
        const addresses = Array.isArray(payload) ? payload : []
        const normalized = searchValue.trim().toLowerCase()
        const matches = addresses
          .filter((a) => a?.toLowerCase().includes(normalized))
          .slice(0, 20)
        setAddressOptions(matches.map((a) => ({ value: a, label: a })))
      } catch (error) {
        console.error('Address search error:', error)
        setAddressOptions([])
      }
    },
    [coordinatorForm],
  )

  const searchEmails = useCallback(
    async (searchValue) => {
      if (!searchValue || !searchValue.trim()) {
        setEmailOptions([])
        return
      }

      const normalized = searchValue.trim().toLowerCase()

      let customerList = allCustomerSuggestions
      if (!customerList.length) {
        customerList = await fetchCustomerSuggestions()
      }

      const matches = (customerList || [])
        .map((c) => c.email)
        .filter(Boolean)
        .filter((e) => e.toLowerCase().includes(normalized))
        .slice(0, 20)

      setEmailOptions(matches.map((e) => ({ value: e, label: e })))
    },
    [allCustomerSuggestions, fetchCustomerSuggestions],
  )

  const searchPhones = useCallback(
    async (searchValue) => {
      if (!searchValue || !searchValue.trim()) {
        setPhoneOptions([])
        return
      }

      const normalized = searchValue.trim().toLowerCase()

      let customerList = allCustomerSuggestions
      if (!customerList.length) {
        customerList = await fetchCustomerSuggestions()
      }

      const matches = (customerList || [])
        .map((c) => c.phone_no)
        .filter(Boolean)
        .filter((p) => p.toLowerCase().includes(normalized))
        .slice(0, 20)

      setPhoneOptions(matches.map((p) => ({ value: p, label: p })))
    },
    [allCustomerSuggestions, fetchCustomerSuggestions],
  )


  const handleCustomerSelect = useCallback((value, option) => {
    const customer = option?.customer
    if (!customer) return

    const addresses = Array.isArray(customer.addresses) ? customer.addresses : []
    setAddressOptions(addresses.map((a) => ({ value: a, label: a })))

    const phones = []
    if (customer.phone_no) phones.push(customer.phone_no)
    if (customer.alternate_contact_details) phones.push(customer.alternate_contact_details)
    setPhoneOptions(Array.from(new Set(phones)).map((p) => ({ value: p, label: p })))

    const emails = []
    if (customer.email) emails.push(customer.email)
    setEmailOptions(Array.from(new Set(emails)).map((e) => ({ value: e, label: e })))

    coordinatorForm.setFieldsValue({
      customer_name: customer.name,
      customer_type: customer.customer_type || '',
    })
  }, [coordinatorForm])

  // Submit new proposal via coordinator endpoint
  const handleCoordinatorSubmit = async (values) => {
    setCoordinatorSubmitLoading(true)
    try {
      const payload = {}
      COORDINATOR_ADD_FIELDS.forEach((fieldName) => {
        const apiName = getApiName(fieldName)
        payload[apiName] = values[fieldName] ?? ''
      })

      const response = await fetch(`${API_BASE_URL}/proposals/add-proposal-coordinator`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to create proposal')
      }

      const result = await response.json()
      const newProjectId = result?.proposal_id
      if (newProjectId) {
        openUploadModalForNewProposal(newProjectId)
      }

      message.success('Proposal created successfully by coordinator')
      closeCoordinatorModal()
      await fetchProposals() // Refresh table
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to create proposal')
    } finally {
      setCoordinatorSubmitLoading(false)
    }
  }

  // Statistics
  const statistics = useMemo(() => {
    const totalProposals = tableData.length
    const totalProjects = tableData.filter((item) => item.project_number?.trim()).length
    const technicallyCompleted = tableData.filter(
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '',
    ).length
    const financiallyCompleted = tableData.filter(
      (item) => item.technical_completed_year?.trim() && item.financial_completed_year?.trim()
    ).length
    const pendingProjects = tableData.filter(
      (item) =>
        item.status === 'Ongoing',
    ).length

    const PROJECT_PREFIXES = ['GSP', 'ISP', 'GAP', 'ILP', 'DPP', 'LSP', 'CLP', 'SO']
    const projectCodeBreakdown = {}
    tableData.forEach((item) => {
      if (item.project_number) {
        const prefix = PROJECT_PREFIXES.find((p) =>
          item.project_number.toUpperCase().startsWith(p),
        )
        if (prefix) {
          projectCodeBreakdown[prefix] = (projectCodeBreakdown[prefix] || 0) + 1
        }
      }
    })

    return {
      totalProposals,
      totalProjects,
      technicallyCompleted,
      financiallyCompleted,
      pendingProjects,
      projectCodeBreakdown,
    }
  }, [tableData])

  // Filtering logic
  useEffect(() => {
    let filtered = tableData

    if (searchText) {
      const s = searchText.trim()
      if (/^\d+$/.test(s)) {
        filtered = filtered.filter((item) => String(item.id) === s)
      } else {
        const lower = s.toLowerCase()
        filtered = filtered.filter((item) =>
          Object.values(item).some((val) => String(val).toLowerCase().includes(lower))
        )
      }
    }

    if (centerFilter) filtered = filtered.filter((item) => item.center === centerFilter)
    if (projectCodePrefix) {
      const prefix = projectCodePrefix.trim().slice(0, 3).toLowerCase()
      filtered = filtered.filter(
        (item) => item.project_number && String(item.project_number).slice(0, 3).toLowerCase() === prefix
      )
    }

    if (orderDateRange?.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.order_date) return false
        const date = dayjs(item.order_date)
        return date.isSameOrAfter(orderDateRange[0].startOf('day')) && date.isSameOrBefore(orderDateRange[1].endOf('day'))
      })
    }

    if (enquiryDateRange?.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.enquiry_date) return false
        const date = dayjs(item.enquiry_date)
        return date.isSameOrAfter(enquiryDateRange[0].startOf('day')) && date.isSameOrBefore(enquiryDateRange[1].endOf('day'))
      })
    }

    if (statusFilter) {
      if (statusFilter === 'totalProjects')
        filtered = filtered.filter((item) => item.project_number?.trim())
      if (statusFilter === 'technicallyCompleted')
        filtered = filtered.filter(
          (item) =>
            item.technical_completed_year &&
            item.technical_completed_year.trim() !== '',
        )
      if (statusFilter === 'financiallyCompleted')
        filtered = filtered.filter(
          (item) => item.technical_completed_year?.trim() && item.financial_completed_year?.trim()
        )
      if (statusFilter === 'pendingProjects')
        filtered = filtered.filter(
          (item) =>
            item.status === 'Ongoing',
        )
      if (statusFilter === 'proposals')
        filtered = filtered.filter((item) => !item.project_number?.trim())
    }

    setFilteredData(filtered)
  }, [searchText, centerFilter, orderDateRange, enquiryDateRange, statusFilter, projectCodePrefix, tableData])

  const uniqueCentres = useMemo(() => [...new Set(tableData.map((i) => i.center).filter(Boolean))].sort(), [tableData])
  const uniqueProjectPrefixes = useMemo(() => {
    const prefixes = tableData
      .map((i) => i.project_number)
      .filter(Boolean)
      .map((code) => String(code).slice(0, 3).toUpperCase())
    return [...new Set(prefixes)].sort()
  }, [tableData])

  const handleExportExcel = () => {
    if (!filteredData.length) return message.warning('No data to export')
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((item) => {
        const row = {}
        TABLE_FIELDS.forEach((f) => (row[f.label] = item[f.name] || ''))
        return row
      })
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proposals')
    XLSX.writeFile(workbook, `proposals_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`)
    message.success('Excel downloaded')
  }

  // Helper function to calculate overdue days
  const calculateOverdueDays = (deliveryDate, extendedDelivery) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Use extended delivery date if present, otherwise use delivery date
    const referenceDate = extendedDelivery
      ? new Date(extendedDelivery)
      : deliveryDate
        ? new Date(deliveryDate)
        : null

    if (!referenceDate || isNaN(referenceDate.getTime())) return null

    const diffMs = today - referenceDate
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDays // positive = overdue, negative = still within deadline
  }

  const columns = useMemo(() => {
    if (statusFilter === 'proposals') {
      return [
        {
          key: 'id',
          dataIndex: 'id',
          title: 'SL NO',
          width: 80,
          render: (text, record, index) => index + 1,
        },
        {
          key: 'enquiry_date',
          dataIndex: 'enquiry_date',
          title: 'Enquiry Date',
          width: 150,
          render: (value) => formatDate(value),
        },
        {
          key: 'customer_type',
          dataIndex: 'customer_type',
          title: 'Customer Type',
          width: 170,
        },
        {
          key: 'customer_name',
          dataIndex: 'customer_name',
          title: 'Customer Name',
          width: 170,
        },
        {
          key: 'address',
          dataIndex: 'address',
          title: 'Address',
          width: 140,
          ellipsis: true,
        },
        {
          key: 'email',
          dataIndex: 'email',
          title: 'Email',
          width: 140,
          ellipsis: true,
        },
        {
          key: 'actions',
          title: 'Actions',
          width: 100,
          render: (_, record) => (
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation()
                openDetailModal(record)
              }}
            >
              More
            </Button>
          ),
        },
      ]
    }

    const isFullViewUser =
      ['ppbd'].includes(currentUserCentre?.toLowerCase()) ||
      ['ppm'].includes(currentUserGroup?.toLowerCase())

    const overdueDaysColumn = {
      key: 'overdue_days',
      dataIndex: 'overdue_days',
      title: 'Overdue Days',
      width: 140,
      render: (_, record) => {
        const overdueDays = calculateOverdueDays(
          record.delivery_date,
          record.extended_delivery_date,
        )

        if (overdueDays === null) return '-'

        if (overdueDays > 0) {
          return (
            <span style={{ color: '#cf1322', fontWeight: 500 }}>
              {overdueDays} days overdue
            </span>
          )
        } else if (overdueDays < 0) {
          return (
            <span style={{ color: '#389e0d', fontWeight: 500 }}>
              {Math.abs(overdueDays)} days remaining
            </span>
          )
        } else {
          return (
            <span style={{ color: '#fa8c16', fontWeight: 500 }}>
              Due Today
            </span>
          )
        }
      },
    }

    // If the user is not in the allowed center/group, show a slim table with a "More" button
    if (!isFullViewUser) {
      return [
        {
          key: 'id',
          dataIndex: 'id',
          title: 'SL NO',
          width: 80,
          render: (text, record, index) => index + 1,
        },
        {
          key: 'project_number',
          dataIndex: 'project_number',
          title: 'Project Number',
          width: 140,
        },
        {
          key: 'customer_name',
          dataIndex: 'customer_name',
          title: 'Customer Name',
          width: 180,
        },
        overdueDaysColumn,
        {
          key: 'dispatch_date',
          dataIndex: 'dispatch_date',
          title: 'Dispatch Date',
          width: 130,
          render: (value) => formatDate(value),
        },
        {
          key: 'project_co_ordinator',
          dataIndex: 'project_co_ordinator',
          title: 'Project Co-ordinator',
          width: 180,
        },
        {
          key: 'actions',
          title: 'Actions',
          width: 100,
          render: (_, record) => (
            <Space size="small">
              <Button size="small" type="link" onClick={() => openDetailModal(record)}>
                More
              </Button>
            </Space>
          ),
        },
      ]
    }

    const dateFields = new Set([
      'order_date',
      'delivery_date',
      'extended_delivery_date',
      'date_of_actual_commencement',
      'dispatch_date',
      'technical_completed_year',
      'financial_completed_year',
    ])

    const base = TABLE_FIELDS.map((f) => {
      const baseColumn = {
        key: f.name,
        dataIndex: f.name,
        title: f.label,
        width: f.width,
      }

      // Custom render for Status field with styled badges
      if (f.name === 'status') {
        return {
          ...baseColumn,
          render: (value) => {
            if (!value) return '-'
            const statusColors = {
              'Ongoing': { bg: '#e3f2fd', color: '#1565c0' },
              'Completed': { bg: '#e8f5e9', color: '#2e7d32' },
              'Delayed': { bg: '#fff3e0', color: '#e65100' },
              'On Hold': { bg: '#f3e5f5', color: '#6a1b9a' },
              'Technically completed': { bg: '#e0f7fa', color: '#00695c' },
              'Short closed by cutomer': { bg: '#fce4ec', color: '#c62828' },
              'Short closed by CMTI': { bg: '#fce4ec', color: '#c62828' },
            }
            const colors = statusColors[value] || { bg: '#f5f5f5', color: '#616161' }
            return (
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                backgroundColor: colors.bg,
                color: colors.color,
                fontWeight: 500,
              }}>
                {value}
              </span>
            )
          }
        }
      }

      return {
        ...baseColumn,
        render: f.render ?? (dateFields.has(f.name) ? (value) => formatDate(value) : undefined),
      }
    })

    // Find index of extended_delivery_date and insert overdue_days after it
    const extendedDeliveryIndex = base.findIndex(
      (col) => col.key === 'extended_delivery_date',
    )

    if (extendedDeliveryIndex !== -1) {
      base.splice(extendedDeliveryIndex + 1, 0, overdueDaysColumn)
    }

    return [
      ...base,
      {
        key: 'actions',
        title: 'Actions',
        width: 80,
        render: (_, record) => (
          <Space size="small">
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Edit
            </Button>
          </Space>
        ),
      },
    ]
  }, [openEditModal, currentUserCentre, currentUserGroup, statusFilter])

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <Tabs defaultActiveKey="proposals">
          <Tabs.TabPane tab="Proposals" key="proposals">
            <div className="space-y-6">
              {/* Header: Stats + Add Button */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer" onClick={() => setStatusFilter('proposals')}>
                    <Statistic title={<span className="text-white/90">Total Proposals</span>} value={proposalCount} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer" onClick={() => setStatusFilter('totalProjects')}>
                    <Statistic title={<span className="text-white/90">Total Projects</span>} value={statistics.totalProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                    {Object.keys(statistics.projectCodeBreakdown).length > 0 && (
                      <div className="mt-2 text-xs text-white/80">
                        {Object.entries(statistics.projectCodeBreakdown)
                          .filter(([, count]) => count > 0)
                          .map(([code, count], idx, arr) => (
                            <span key={code}>
                              {code}: {count}
                              {idx < arr.length - 1 ? ' | ' : ''}
                            </span>
                          ))}
                      </div>
                    )}
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer" onClick={() => setStatusFilter('technicallyCompleted')}>
                    <Statistic title={<span className="text-white/90">Technically Completed</span>} value={statistics.technicallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer" onClick={() => setStatusFilter('financiallyCompleted')}>
                    <Statistic title={<span className="text-white/90">Financially Completed</span>} value={statistics.financiallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer" onClick={() => setStatusFilter('pendingProjects')}>
                    <Statistic title={<span className="text-white/90">Ongoing Projects</span>} value={statistics.pendingProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                </div>

                
              </div>

              {/* Search & Filters */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <Title level={4} className="!mb-4">Search & Filters</Title>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={6}>
                    <Input placeholder="Search proposals..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear size="large" />
                  </Col>
                  <Col xs={24} md={4}>
                    <Select placeholder="Project Code Prefix" value={projectCodePrefix || undefined} onChange={setProjectCodePrefix} allowClear size="large" style={{ width: '100%' }}>
                      {uniqueProjectPrefixes.map((p) => (<Select.Option key={p} value={p}>{p}</Select.Option>))}
                    </Select>
                  </Col>
                  <Col xs={24} md={4}>
                    <Select placeholder="Centre" value={centerFilter} onChange={setCentreFilter} allowClear size="large" style={{ width: '100%' }}>
                      {uniqueCentres.map((c) => (<Select.Option key={c} value={c}>{c}</Select.Option>))}
                    </Select>
                  </Col>
                  <Col xs={24} md={5}>
                    <RangePicker placeholder={['Order Date Start', 'End']} value={orderDateRange} onChange={setOrderDateRange} size="large" style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} />
                  </Col>
                  <Col xs={24} md={5}>
                    <RangePicker placeholder={['Enquiry Start', 'End']} value={enquiryDateRange} onChange={setEnquiryDateRange} size="large" style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} />
                  </Col>
                </Row>
                <div className="mt-4 flex justify-between">
                  <Button onClick={() => {
                    setSearchText('')
                    setCentreFilter(null)
                    setOrderDateRange(null)
                    setEnquiryDateRange(null)
                    setStatusFilter(null)
                    setProjectCodePrefix('')
                  }}>
                    Clear Filters
                  </Button>
                  <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportExcel}>
                    Export to Excel
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <Title level={4} className="!mb-1">Proposal / Projects</Title>
                    <p className="text-slate-500 text-sm">Showing {filteredData.length} records</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type={showUnacknowledgedOnly ? 'primary' : 'default'}
                      size="large"
                      danger
                      disabled={!unacknowledgedCount}
                      onClick={handleUnacknowledgedToggle}
                      className={showUnacknowledgedOnly ? 'shadow-md hover:shadow-lg' : ''}
                    >
                      ⚠️ Unacknowledged{unacknowledgedCount > 0 ? (
                        <span className="ml-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs">{unacknowledgedCount}</span>
                      ) : null}
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlusOutlined />}
                      onClick={openCoordinatorAddModal}
                      className="bg-gradient-to-r from-green-500 to-green-600 border-none shadow-md hover:shadow-lg"
                    >
                      Add Proposal
                    </Button>
                    {createdProjectId && (
                      <Button
                        type="default"
                        size="large"
                        icon={<UploadOutlined />}
                        onClick={() => openUploadModalForNewProposal(createdProjectId)}
                      >
                        Upload Docs
                      </Button>
                    )}
                  </div>
                </div>
                <Table
                  className="role-proposals-table"
                  rowKey="key"
                  columns={columns}
                  dataSource={filteredData}
                  loading={tableLoading}
                  pagination={{ pageSize: 10 }}
                  tableLayout="fixed"
                  sticky
                  bordered
                  onRow={(record) => ({
                    onClick: () => openDetailModal(record),
                    style: { cursor: 'pointer' },
                  })}
                />
              </div>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* Detail View Modal */}
      <Modal
        title="Proposal Details"
        open={detailModalOpen}
        onCancel={closeDetailModal}
        width={900}
        footer={[
          <Button key="close" onClick={closeDetailModal}>Close</Button>,
          <Button
            key="view-docs"
            type="default"
            disabled={!selectedRecord?.id}
            onClick={() => {
              if (selectedRecord?.id) {
                openDocsModal(selectedRecord.id)
              }
            }}
          >
            View Uploads
          </Button>,
          <Button
            key="upload"
            type="default"
            disabled={!selectedRecord?.id}
            onClick={() => {
              if (selectedRecord?.id) {
                closeDetailModal()
                openUploadModalForNewProposal(selectedRecord.id)
              }
            }}
          >
            Upload
          </Button>,
          <Button key="edit" type="primary" onClick={() => {
            closeDetailModal()
            openEditModal(selectedRecord)
          }}>Edit</Button>,
        ]}
        maskClosable={false}
      >
        {selectedRecord && (
          <div style={{ maxHeight: '65vh', overflowY: 'auto' }} className="space-y-4">
            <Card title="Customer / Enquiry" size="small" className="bg-blue-50">
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Enquiry Date">{formatDate(selectedRecord?.enquiry_date) || '-'}</Descriptions.Item>
                <Descriptions.Item label="Customer Type">{selectedRecord?.customer_type || '-'}</Descriptions.Item>
                <Descriptions.Item label="Customer Name">{selectedRecord?.customer_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedRecord?.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="Phone No.">{selectedRecord?.phone_no || '-'}</Descriptions.Item>
                <Descriptions.Item label="Alternate Contact">{selectedRecord?.alternate_contact_details || '-'}</Descriptions.Item>
                <Descriptions.Item label="Request Type">{selectedRecord?.request_type || '-'}</Descriptions.Item>
                <Descriptions.Item label="Email Reference">{selectedRecord?.email_reference || '-'}</Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>{selectedRecord?.address || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="CMTI / Coordinator" size="small" className="bg-blue-50">
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Proposal Given By">{selectedRecord?.quotation_given_by_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Department">{selectedRecord?.quotation_given_by_department || '-'}</Descriptions.Item>
                <Descriptions.Item label="Centre">{selectedRecord?.center || '-'}</Descriptions.Item>
                <Descriptions.Item label="Group">{selectedRecord?.group || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Quotation" size="small" className="bg-blue-50">
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Quote Reference">{selectedRecord?.quote_reference || '-'}</Descriptions.Item>
                <Descriptions.Item label="Quote Date">{formatDate(selectedRecord?.quote_date) || '-'}</Descriptions.Item>
                <Descriptions.Item label="Quote Amount">{selectedRecord?.quote_amount || '-'}</Descriptions.Item>
                <Descriptions.Item label="Revised/Negotiated">{selectedRecord?.revised_negotiated || '-'}</Descriptions.Item>
                <Descriptions.Item label="Revised Quote Date">{formatDate(selectedRecord?.revised_negotiated_quote_date) || '-'}</Descriptions.Item>
                <Descriptions.Item label="Revised Quote Amount">{selectedRecord?.revised_negotiated_quote_amount || '-'}</Descriptions.Item>
                <Descriptions.Item label="Quote Description" span={2}>{selectedRecord?.quote_description || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Acknowledgement" size="small" className="bg-blue-50">
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Is Acknowledged">{selectedRecord?.is_acknowledged === true ? 'Yes' : selectedRecord?.is_acknowledged === false ? 'No' : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Enquiry Documents" size="small" className="bg-gray-50">
              <Table
                size="small"
                rowKey={(row, idx) => row?.id ?? row?.key ?? idx}
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
                    render: (value) => (value ? dayjs(value).format(DISPLAY_DATE_FORMAT + ' HH:mm') : '-'),
                  },
                  {
                    title: 'View',
                    key: 'view',
                    width: 80,
                    render: (_, record) => (
                      <Button type="link" icon={<EyeOutlined />} onClick={() => viewDocument(record)} />
                    ),
                  },
                ]}
              />
              {(!docsLoading && !projectDocs.length) && (
                <div className="text-center text-gray-500 mt-4">No enquiry documents uploaded</div>
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* Add Proposal Modal (Coordinator) */}
      <Modal
        title="Add Proposal (Coordinator)"
        open={coordinatorModalOpen}
        onCancel={closeCoordinatorModal}
        width={1100}
        footer={[
          <Button key="cancel" onClick={closeCoordinatorModal}>Cancel</Button>,
          <Button
            key="upload"
            type="default"
            disabled={!createdProjectId}
            onClick={() => {
              if (createdProjectId) {
                openUploadModalForNewProposal(createdProjectId)
              } else {
                message.warning('Create a proposal first to upload documents')
              }
            }}
          >
            Upload
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={coordinatorSubmitLoading}
            onClick={() => coordinatorForm.submit()}
          >
            Submit
          </Button>,
        ]}
        maskClosable={false}
      >
        <Form form={coordinatorForm} layout="vertical" onFinish={handleCoordinatorSubmit}>
          <Row gutter={[16, 16]}>
            {COORDINATOR_ADD_FIELDS.map((fieldName) => {
              const field = PROPOSAL_FIELDS.find((f) => f.name === fieldName)
              if (!field) return null

              const isDate = ['enquiry_date', 'quote_date', 'revised_negotiated_quote_date'].includes(fieldName)
              const isTextArea = field.input === 'textarea'
              const isCustomerType = fieldName === 'customer_type'
              const isRequestType = fieldName === 'request_type'
              const isReadOnlyName = fieldName === 'quotation_given_by_name'
              const isReadOnlyDept = fieldName === 'quotation_given_by_department'
              const isReadOnlyCentre = fieldName === 'center'
              const isReadOnlyGroup = fieldName === 'group'
              const isCustomerName = fieldName === 'customer_name'
              const isAddressField = fieldName === 'address'
              const isEmailField = fieldName === 'email'
              const isPhoneField = fieldName === 'phone_no'

              return (
                <Col span={12} key={fieldName}>
                  <Form.Item
                    name={fieldName}
                    label={field.label}
                  >
                    {isDate ? (
                      <DatePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} placeholder={`Select ${field.label}`} />
                    ) : isTextArea ? (
                      <TextArea rows={3} placeholder={`Enter ${field.label}`} />
                    ) : isCustomerType ? (
                      <Select placeholder="Select Customer Type" allowClear>
                        {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : isRequestType ? (
                      <Select placeholder="Select Request Type" allowClear>
                        {REQUEST_TYPE_OPTIONS.map((opt) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : isCustomerName ? (
                      <AutoComplete
                        options={customerOptions}
                        onSearch={searchCustomers}
                        onSelect={handleCustomerSelect}
                        placeholder="Search existing customers..."
                        style={{ width: '100%' }}
                        allowClear
                      >
                        <Input />
                      </AutoComplete>
                    ) : isAddressField ? (
                      <AutoComplete
                        options={addressOptions}
                        onSearch={searchAddresses}
                        placeholder="Type or select address..."
                        style={{ width: '100%' }}
                        allowClear
                        onSelect={(value) => coordinatorForm.setFieldsValue({ address: value })}
                      >
                        <Input />
                      </AutoComplete>
                    ) : isEmailField ? (
                      <AutoComplete
                        options={emailOptions}
                        onSearch={searchEmails}
                        placeholder="Type or select email..."
                        style={{ width: '100%' }}
                        allowClear
                        onSelect={(value) => coordinatorForm.setFieldsValue({ email: value })}
                      >
                        <Input />
                      </AutoComplete>
                    ) : isPhoneField ? (
                      <AutoComplete
                        options={phoneOptions}
                        onSearch={searchPhones}
                        placeholder="Type or select phone..."
                        style={{ width: '100%' }}
                        allowClear
                        onSelect={(value) => coordinatorForm.setFieldsValue({ phone_no: value })}
                      >
                        <Input />
                      </AutoComplete>
                    ) : isReadOnlyName || isReadOnlyDept || isReadOnlyCentre || isReadOnlyGroup ? (
                      <Input disabled style={{ background: '#f5f5f5', color: '#000' }} />
                    ) : (
                      <Input placeholder={`Enter ${field.label}`} />
                    )}
                  </Form.Item>
                </Col>
              )
            })}
          </Row>
        </Form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        title={`Upload Document - ${selectedStageForUpload?.stage_name || 'Enquiry'}`}
        open={uploadModalVisible}
        onCancel={handleCloseUploadModal}
        footer={[
          <Button key="cancel" onClick={handleCloseUploadModal}>Cancel</Button>,
          <Button key="upload" type="primary" loading={uploading} onClick={handleUpload}>Upload</Button>,
        ]}
        width={600}
      >
        <Space direction="vertical" size="large" className="w-full">
          <Dragger {...{
            multiple: false,
            maxCount: 1,
            beforeUpload: (file) => {
              setFileToUpload(file)
              return false
            },
            onRemove: () => setFileToUpload(null),
            fileList: fileToUpload
              ? [{
                  uid: fileToUpload.uid || fileToUpload.name,
                  name: fileToUpload.name,
                  status: 'done',
                  originFileObj: fileToUpload,
                }]
              : [],
          }}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag file to this area</p>
          </Dragger>

          <Input placeholder="Document Name *" value={documentName} disabled />
          <TextArea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <Input placeholder="Your Name *" value={uploadedBy} disabled />
        </Space>
      </Modal>

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
              render: (value) => (value ? dayjs(value).format(DISPLAY_DATE_FORMAT + ' HH:mm') : '-'),
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

      {/* Edit Proposal Modal */}
      <Modal
        title={editingRecord ? `Edit Proposal / Project` : 'Edit Proposal / Project'}
        open={modalOpen}
        onCancel={closeModal}
        width={1100}
        okText="Update"
        confirmLoading={submitLoading}
        onOk={() => form.submit()}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            {TABLE_FIELDS.map((field) => {
              const allowedEditFields = [
                'extended_delivery_date',
                'co_ordinator_remarks',
                'technical_completed_year',
                'updated_by',
              ]

              // When editing, only show the allowed edit fields
              if (editingRecord && !allowedEditFields.includes(field.name)) {
                return null
              }

              const isTextArea = field.input === 'textarea'
              const isUpdatedByField = field.name === 'updated_by'
              
              // Date fields that should use DatePicker
              const dateFields = [
                'enquiry_date',
                'quote_date',
                'revised_negotiated_quote_date',
                'order_date',
                'delivery_date',
                'extended_delivery_date',
                'date_of_actual_commencement',
                'dispatch_date',
              ]
              const isDateField = dateFields.includes(field.name)
              
              return (
                <Col span={12} key={field.name}>
                  <Form.Item 
                    name={field.name} 
                    label={field.label} 
                    rules={field.required ? [{ required: true, message: `${field.label} is required` }] : []}
                    getValueProps={(value) => ({
                      value: value && isDateField
                        ? dayjs(value).isValid()
                          ? dayjs(value)
                          : null
                        : value,
                    })}
                    normalize={(value) => {
                      if (!value) return ''
                      if (isDateField && dayjs.isDayjs(value)) {
                        return value.format('YYYY-MM-DD')
                      }
                      return value
                    }}
                  >
                    {isTextArea ? (
                      <TextArea rows={3} placeholder={`Enter ${field.label}`} disabled={isUpdatedByField && editingRecord} />
                    ) : isDateField ? (
                      <DatePicker 
                        style={{ width: '100%' }} 
                        format="DD.MM.YYYY" 
                        placeholder={`Select ${field.label}`}
                      />
                    ) : (
                      <Input placeholder={`Enter ${field.label}`} disabled={isUpdatedByField && editingRecord} />
                    )}
                  </Form.Item>
                </Col>
              )
            })}
          </Row>
        </Form>
      </Modal>
    </>
  )
}

export default Proposals
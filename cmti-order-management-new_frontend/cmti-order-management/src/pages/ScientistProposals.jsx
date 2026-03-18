import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  EditOutlined,
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

// Slim columns for Scientist (matching GH restricted view)
const TABLE_FIELDS = [
  { name: 'id', label: 'SL NO', width: 50, render: (text, record, index) => index + 1 },
  { name: 'project_number', label: 'Project Number', width: 100 },
  { name: 'activity', label: 'Project Name', width: 140 },
  { name: 'customer_name', label: 'Customer Name', width: 120 },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 100 },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 120 },
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
  { name: 'is_acknowledged', label: 'Is Acknowledged', width: 150, inForm: false },
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
  // Quote fields removed - only admin should see these
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

// Map API field names to UI field names
const API_FIELD_MAP = {
  'revised/negotiated': 'revised_negotiated',
  'revised/negotiated_quote_date': 'revised_negotiated_quote_date',
  'revised/negotiated_quote_amount': 'revised_negotiated_quote_amount',
}

function ScientistProposals() {
  const [form] = Form.useForm()
  const [coordinatorForm] = Form.useForm()

  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [centerFilter, setCenterFilter] = useState(null)
  const [groupFilter, setGroupFilter] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [statusFilter, setStatusFilter] = useState('totalProjects')
  const [projectNumberFilter, setProjectNumberFilter] = useState(null)
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserCenter, setCurrentUserCenter] = useState('')
  const [currentUserGroup, setCurrentUserGroup] = useState('')
  const [stats, setStats] = useState({
    totalProposals: 0,
    totalProjects: 0,
    technicallyCompleted: 0,
    financiallyCompleted: 0,
    ongoingProjects: 0
  })
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false)
  const [coordinatorSubmitLoading, setCoordinatorSubmitLoading] = useState(false)
  const [customerOptions, setCustomerOptions] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [userRole, setUserRole] = useState('')

  // Unacknowledged proposals state
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [showUnacknowledgedOnly, setShowUnacknowledgedOnly] = useState(false)
  const [originalTableData, setOriginalTableData] = useState([])

  // Document modal state
  const [stageConfig, setStageConfig] = useState([])
  const [docsModalVisible, setDocsModalVisible] = useState(false)
  const [projectDocs, setProjectDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [viewDocumentUrl, setViewDocumentUrl] = useState(null)

  // Scientist can only edit certain fields
  const SCIENTIST_EDITABLE_FIELDS = [
    'extended_delivery_date',
    'co_ordinator_remarks',
    'technical_completed_year',
    'updated_by',
    'closer_report',
  ]

  // Map API response to UI format
  const mapApiToUi = (item) => {
    const mapped = { ...item }
    // Map API field names to UI field names
    Object.entries(API_FIELD_MAP).forEach(([apiName, uiName]) => {
      if (item[apiName] !== undefined) {
        mapped[uiName] = item[apiName]
      }
    })
    return mapped
  }

  const fetchProposals = useCallback(async () => {
    setTableLoading(true)
    let name = ''
    try {
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        name = parsedUser.name || ''
        setCurrentUserName(name)
        setCurrentUserCenter(parsedUser.center || '')
        setCurrentUserGroup(parsedUser.group || '')
        setUserRole(parsedUser.role?.toLowerCase() || '')
      }
    } catch (storageError) {
      console.error('Failed to read user from localStorage', storageError)
    }

    try {
      if (!name) {
        throw new Error('User name not found in localStorage')
      }

      const encodedName = encodeURIComponent(name)
      const url = `${API_BASE_URL}/proposals/by-name/${encodedName}?user_role=scientist`

      const response = await fetch(url, {
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setTableData([])
          setFilteredData([])
          return
        }
        throw new Error('Unable to fetch proposals')
      }

      const list = await response.json()
      const normalized = list.map(mapApiToUi)

      // Fetch all documents to compute per-proposal document counts (Enquiry stage only)
      try {
        // First fetch stage config to identify Enquiry stage
        const stagesRes = await fetch(`${API_BASE_URL}/stages/`, {
          headers: { accept: 'application/json' },
        })
        let enquiryStageId = null
        if (stagesRes.ok) {
          const stages = await stagesRes.json()
          const enquiryStage = (Array.isArray(stages) ? stages : []).find(
            (s) => (s.name || '').toString().trim().toLowerCase() === 'enquiry',
          )
          enquiryStageId = enquiryStage?.id
        }

        const docsRes = await fetch(`${API_BASE_URL}/documents/`, {
          headers: { accept: 'application/json' },
        })
        if (docsRes.ok) {
          const allDocs = await docsRes.json()
          const docsByProject = {};
          (Array.isArray(allDocs) ? allDocs : []).forEach((d) => {
            const pid = d?.project_id ?? d?.project ?? d?.projectId
            if (pid == null) return
            // Only count Enquiry stage documents
            if (enquiryStageId) {
              const docStageId = d?.stage_id ?? d?.stage ?? d?.stageId
              if (docStageId == null || String(docStageId) !== String(enquiryStageId)) return
            }
            docsByProject[pid] = (docsByProject[pid] || 0) + 1
          })
          normalized.forEach((item) => {
            item._docCount = docsByProject[item.id] || 0
          })
        }
      } catch (docErr) {
        console.error('Failed to fetch document counts:', docErr)
      }

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

  const fetchStats = useCallback(async () => {
    try {
      const rawUser = window.localStorage.getItem('ppm_user')
      if (!rawUser) return
      const parsedUser = JSON.parse(rawUser)
      const name = parsedUser.name
      if (!name) return

      const encodedName = encodeURIComponent(name)
      const url = `${API_BASE_URL}/proposals/stats/by-scientist/${encodedName}`
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Unable to fetch proposal stats')
      }

      const payload = await response.json()
      setStats(payload)
    } catch (error) {
      console.error(error)
    }
  }, [])

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
      const list = await response.json()
      const normalized = (Array.isArray(list) ? list : []).map(mapApiToUi)
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
      setShowUnacknowledgedOnly(false)
      setTableData(originalTableData)
      setFilteredData(originalTableData)
      fetchProposals()
    } else {
      if (!unacknowledgedCount) {
        message.info('No unacknowledged proposals')
        return
      }
      setShowUnacknowledgedOnly(true)
      fetchUnacknowledgedProposals()
    }
  }

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

      const projectDocsRaw = docs.filter((d) => {
        const docProjectId = d?.project_id ?? d?.project ?? d?.projectId
        if (docProjectId == null || projectId == null) return false
        return String(docProjectId) === String(projectId)
      })

      const stageFiltered = projectDocsRaw.filter((d) => {
        if (!enquiryStageId) return true
        const docStageId = d?.stage_id ?? d?.stage ?? d?.stageId
        if (docStageId == null) return false
        return String(docStageId) === String(enquiryStageId)
      })

      const filtered = stageFiltered

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

  useEffect(() => {
    if (!detailModalOpen) return
    if (!selectedRecord?.id) return
    fetchProjectDocuments(selectedRecord.id)
  }, [detailModalOpen, selectedRecord, fetchProjectDocuments])

  const viewDocument = useCallback((doc) => {
    const raw = doc?.url || doc?.file
    if (!raw) {
      return message.error('Document URL is not available')
    }
    const url = /^https?:\/\//i.test(raw)
      ? raw
      : `${API_BASE_URL}${String(raw).startsWith('/') ? '' : '/'}${raw}`
    setViewDocumentUrl(url)
  }, [])

  useEffect(() => {
    fetchProposals()
    fetchStats()
    fetchStageConfig()
    fetchUnacknowledgedCount()
  }, [fetchProposals, fetchStats, fetchStageConfig])

  const openEditModal = useCallback(
    (record) => {
      setEditingRecord(record)
      form.setFieldsValue({ ...record, updated_by: currentUserName || record.updated_by })
      setModalOpen(true)
    },
    [form, currentUserName],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }, [form])

  const openDetailModal = useCallback((record) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }, [])

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedRecord(null)
  }, [])

  // Open/Close Coordinator Add Modal
  const openCoordinatorAddModal = () => {
    coordinatorForm.resetFields()

    if (currentUserName) {
      coordinatorForm.setFieldsValue({
        quotation_given_by_name: currentUserName,
        quotation_given_by_department: currentUserCenter ? currentUserCenter.toUpperCase() : '',
        center: currentUserCenter || '',
        group: currentUserGroup || '',
      })
    }

    setCoordinatorModalOpen(true)
  }

  const closeCoordinatorModal = () => {
    setCoordinatorModalOpen(false)
    coordinatorForm.resetFields()
    setCustomerOptions([])
  }

  // Search customers by name
  const searchCustomers = useCallback(async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setCustomerOptions([])
      return
    }

    setCustomerSearchLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/customers/search?q=${encodeURIComponent(searchValue)}`, {
        headers: { accept: 'application/json' },
      })
      if (response.ok) {
        const data = await response.json()
        setCustomerOptions(data.map(c => ({ value: c.name, ...c })))
      }
    } catch (error) {
      console.error('Customer search error:', error)
    } finally {
      setCustomerSearchLoading(false)
    }
  }, [])

  const handleCoordinatorSubmit = async (values) => {
    setCoordinatorSubmitLoading(true)

    // Helper to get API name if different
    const getApiName = (fieldName) => {
      const apiMap = {
        'revised_negotiated': 'revised/negotiated',
        'revised_negotiated_quote_date': 'revised/negotiated_quote_date',
        'revised_negotiated_quote_amount': 'revised/negotiated_quote_amount',
      }
      return apiMap[fieldName] || fieldName
    }

    const payload = {}
    COORDINATOR_ADD_FIELDS.forEach((fieldName) => {
      const apiName = getApiName(fieldName)
      payload[apiName] = values[fieldName] ?? ''
    })

    try {
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

      message.success('Proposal created successfully')
      closeCoordinatorModal()
      await fetchProposals()
      await fetchStats()
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to create proposal')
    } finally {
      setCoordinatorSubmitLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    if (!editingRecord?.id) {
      message.error('No record selected for editing')
      return
    }

    setSubmitLoading(true)

    const payload = {
      project_id: editingRecord.id,
      extended_delivery_date: values.extended_delivery_date || '',
      co_ordinator_remarks: values.co_ordinator_remarks || '',
      technical_completed_year: values.technical_completed_year || null,
      closer_report: values.closer_report || '',
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
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '' &&
        item.financial_completed_year &&
        item.financial_completed_year.trim() !== '',
    ).length
    const pendingProjects = tableData.filter(
      (item) => item.status === 'Ongoing',
    ).length

    // Calculate project code breakdown
    const PROJECT_PREFIXES = ['GSP', 'ISP', 'GAP', 'ILP', 'DPP', 'LSP', 'CLP', 'SO']
    const projectCodeBreakdown = {}
    tableData.forEach((item) => {
      if (item.project_number?.trim()) {
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

  // Filter data based on search and filters
  useEffect(() => {
    let filtered = [...tableData]

    if (searchText) {
      const s = searchText.trim()
      if (/^\d+$/.test(s)) {
        filtered = filtered.filter((item) => String(item.id) === s)
      } else {
        const searchLower = s.toLowerCase()
        filtered = filtered.filter((item) =>
          Object.values(item).some((val) =>
            String(val).toLowerCase().includes(searchLower),
          ),
        )
      }
    }

    if (centerFilter) {
      filtered = filtered.filter((item) => item.center === centerFilter)
    }

    if (groupFilter) {
      filtered = filtered.filter((item) => item.group === groupFilter)
    }

    if (projectNumberFilter) {
      const prefix = projectNumberFilter.toUpperCase()
      filtered = filtered.filter((item) => {
        const pn = (item.project_number || '').toString().trim().toUpperCase()
        if (!pn) return false
        return pn.startsWith(prefix)
      })
    }

    if (dateRange && dateRange.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.order_date) return false
        const orderDate = dayjs(item.order_date)
        if (!orderDate.isValid()) return false
        const start = dateRange[0].startOf('day')
        const end = dateRange[1].endOf('day')
        return (
          orderDate.isSameOrAfter(start) && orderDate.isSameOrBefore(end)
        )
      })
    }

    if (statusFilter) {
      if (statusFilter === 'totalProjects') {
        filtered = filtered.filter((item) => item.project_number?.trim())
      } else if (statusFilter === 'technicallyCompleted') {
        filtered = filtered.filter(
          (item) =>
            item.technical_completed_year &&
            item.technical_completed_year.trim() !== '',
        )
      } else if (statusFilter === 'financiallyCompleted') {
        filtered = filtered.filter(
          (item) =>
            item.technical_completed_year &&
            item.technical_completed_year.trim() !== '' &&
            item.financial_completed_year &&
            item.financial_completed_year.trim() !== '',
        )
      } else if (statusFilter === 'pendingProjects') {
        filtered = filtered.filter(
          (item) => item.status === 'Ongoing',
        )
      } else if (statusFilter === 'proposals') {
        filtered = filtered.filter((item) => !item.project_number?.trim())
      }
    }

    setFilteredData(filtered)
  }, [searchText, centerFilter, groupFilter, dateRange, statusFilter, projectNumberFilter, tableData])

  const uniqueCenters = useMemo(() => {
    const centers = [
      ...new Set(tableData.map((item) => item.center).filter(Boolean)),
    ]
    return centers.sort()
  }, [tableData])

  const uniqueGroups = useMemo(() => {
    const groups = [
      ...new Set(tableData.map((item) => item.group).filter(Boolean)),
    ]
    return groups.sort()
  }, [tableData])

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      message.warning('No data to export')
      return
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((item) => {
        const row = {}
        TABLE_FIELDS.forEach((field) => {
          row[field.label] = item[field.name] || ''
        })
        return row
      }),
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proposals')
    XLSX.writeFile(
      workbook,
      `scientist_proposals_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`,
    )
    message.success('Excel file downloaded successfully')
  }

  // Helper function to calculate overdue days
  const calculateOverdueDays = (deliveryDate, extendedDelivery) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const referenceDate = extendedDelivery
      ? new Date(extendedDelivery)
      : deliveryDate
        ? new Date(deliveryDate)
        : null

    if (!referenceDate || isNaN(referenceDate.getTime())) return null

    const diffMs = today - referenceDate
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDays
  }

  const columns = useMemo(() => {
    if (statusFilter === 'proposals') {
      return [
        {
          key: 'id',
          dataIndex: 'id',
          title: 'SL NO',
          width: 50,
          render: (text, record, index) => index + 1,
        },
        {
          key: 'enquiry_date',
          dataIndex: 'enquiry_date',
          title: 'Enquiry Date',
          width: 110,
          render: (value) => formatDate(value),
        },
        {
          key: 'customer_type',
          dataIndex: 'customer_type',
          title: 'Customer Type',
          width: 100,
        },
        {
          key: 'customer_name',
          dataIndex: 'customer_name',
          title: 'Customer Name',
          width: 120,
        },
        {
          key: 'address',
          dataIndex: 'address',
          title: 'Address',
          width: 120,
          ellipsis: true,
        },
        {
          key: 'email',
          dataIndex: 'email',
          title: 'Email',
          width: 120,
          ellipsis: true,
        },
        {
          key: 'actions',
          title: 'Actions',
          width: 70,
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

    const dateFields = new Set([
      'order_date',
      'delivery_date',
      'extended_delivery_date',
      'date_of_actual_commencement',
      'dispatch_date',
      'technical_completed_year',
      'financial_completed_year',
    ])

    const baseColumns = TABLE_FIELDS.map((field) => {
      const baseColumn = {
        key: field.name,
        dataIndex: field.name,
        title: field.label,
        width: field.width,
        fixed: field.fixed,
      }

      if (field.name === 'status') {
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
        render: field.render ?? (dateFields.has(field.name) ? (value) => formatDate(value) : undefined),
      }
    })

    const customerNameIndex = baseColumns.findIndex(
      (col) => col.key === 'customer_name',
    )

    const overdueDaysColumn = {
      key: 'overdue_days',
      dataIndex: 'overdue_days',
      title: 'Overdue Days',
      width: 100,
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

    if (customerNameIndex !== -1) {
      baseColumns.splice(customerNameIndex + 1, 0, overdueDaysColumn)
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        title: 'Actions',
        width: 70,
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
  }, [openEditModal, openDetailModal, openDocsModal, statusFilter])

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <Tabs
          defaultActiveKey="proposals"
          items={[
            {
              key: 'proposals',
              label: 'Proposals',
              children: (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <Card
                      className="bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer"
                      onClick={() => setStatusFilter('proposals')}
                    >
                      <Statistic title={<span className="text-white/90">Total Proposals</span>} value={statistics.totalProposals} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer"
                      onClick={() => setStatusFilter('totalProjects')}
                    >
                      <Statistic title={<span className="text-white/90">Total Projects</span>} value={stats?.totalProjects ?? statistics.totalProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
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
                    <Card
                      className="bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer"
                      onClick={() => setStatusFilter('technicallyCompleted')}
                    >
                      <Statistic title={<span className="text-white/90">Technically Completed</span>} value={statistics.technicallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer"
                      onClick={() => setStatusFilter('financiallyCompleted')}
                    >
                      <Statistic title={<span className="text-white/90">Financially Completed</span>} value={statistics.financiallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer"
                      onClick={() => setStatusFilter('pendingProjects')}
                    >
                      <Statistic title={<span className="text-white/90">Ongoing Projects</span>} value={statistics.pendingProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                    </Card>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Search & Filters */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4">
                        <Title level={4} className="!mb-0">Search & Filters</Title>
                      </div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={6}>
                          <Input
                            placeholder="Search proposals..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            size="large"
                            allowClear
                          />
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Select
                            placeholder="Filter by Project Number"
                            value={projectNumberFilter}
                            onChange={setProjectNumberFilter}
                            size="large"
                            allowClear
                            style={{ width: '100%' }}
                          >
                            {['GSP', 'ISP', 'GAP', 'ILP', 'DPP', 'LSP', 'CLP', 'SO'].map((code) => (
                              <Select.Option key={code} value={code}>
                                {code}
                              </Select.Option>
                            ))}
                          </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Select
                            placeholder="Filter by Centre"
                            value={centerFilter}
                            onChange={setCenterFilter}
                            size="large"
                            allowClear
                            style={{ width: '100%' }}
                          >
                            {uniqueCenters.map((center) => (
                              <Select.Option key={center} value={center}>
                                {center}
                              </Select.Option>
                            ))}
                          </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Select
                            placeholder="Filter by Group"
                            value={groupFilter}
                            onChange={setGroupFilter}
                            size="large"
                            allowClear
                            style={{ width: '100%' }}
                          >
                            {uniqueGroups.map((group) => (
                              <Select.Option key={group} value={group}>
                                {group}
                              </Select.Option>
                            ))}
                          </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <RangePicker
                            placeholder={['Start Date', 'End Date']}
                            value={dateRange}
                            onChange={setDateRange}
                            size="large"
                            style={{ width: '100%' }}
                            format={DISPLAY_DATE_FORMAT}
                          />
                        </Col>
                        <Col xs={24} sm={12} md={6} className="flex items-center">
                          <Button
                            onClick={() => {
                              setSearchText('')
                              setCenterFilter(null)
                              setGroupFilter(null)
                              setDateRange(null)
                              setStatusFilter(null)
                              setProjectNumberFilter(null)
                            }}
                            size="large"
                            style={{ width: '100%' }}
                          >
                            Clear Filters
                          </Button>
                        </Col>
                        <Col xs={24} sm={12} md={6} className="flex items-center">
                          <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            size="large"
                            onClick={handleExportExcel}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 border-none shadow-md hover:shadow-lg w-full"
                          >
                            Export to Excel
                          </Button>
                        </Col>
                      </Row>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <Title level={4} className="!mb-1">My Proposals</Title>
                          <p className="text-slate-500 text-sm">
                            Showing {filteredData.length} of {tableData.length} proposals
                          </p>
                        </div>
                        <Space wrap>
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
                        </Space>
                      </div>
                      <Table
                        className="role-proposals-table"
                        rowKey="id"
                        columns={columns}
                        dataSource={filteredData}
                        loading={tableLoading}
                        pagination={{ pageSize: 10 }}
                        tableLayout="fixed"
                        sticky
                        bordered
                      />
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title="Proposal Details"
        open={detailModalOpen}
        onCancel={closeDetailModal}
        width={900}
        footer={[
          <Button key="close" onClick={closeDetailModal}>Close</Button>,
          statusFilter !== 'proposals' && (
            <Button key="edit" type="primary" onClick={() => {
              closeDetailModal()
              openEditModal(selectedRecord)
            }}>Edit</Button>
          ),
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

      {/* Edit Modal */}
      <Modal
        title="Edit Proposal"
        open={modalOpen}
        onCancel={closeModal}
        width={1000}
        okText="Update"
        confirmLoading={submitLoading}
        onOk={() => form.submit()}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ updated_by: currentUserName }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {ALL_FIELDS.filter(f => SCIENTIST_EDITABLE_FIELDS.includes(f.name)).map((field) => {
              const dateFields = [
                'extended_delivery_date',
              ]
              const isDateField = dateFields.includes(field.name)

              if (isDateField) {
                return (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
                    getValueProps={(value) => ({ value: value ? dayjs(value).isValid() ? dayjs(value) : null : null })}
                    normalize={(value) => {
                      if (!value) return ''
                      if (dayjs.isDayjs(value)) return value.format('YYYY-MM-DD')
                      return value
                    }}
                  >
                    <DatePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} placeholder={`Select ${field.label}`} />
                  </Form.Item>
                )
              }

              const InputComponent = field.input === 'textarea' ? TextArea : Input
              const isUpdatedByField = field.name === 'updated_by'

              return (
                <Form.Item
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
                >
                  <InputComponent rows={2} disabled={isUpdatedByField} />
                </Form.Item>
              )
            })}
          </div>
        </Form>
      </Modal>

      {/* Add Proposal Modal (Coordinator) */}
      <Modal
        title="Add Proposal (Coordinator)"
        open={coordinatorModalOpen}
        onCancel={closeCoordinatorModal}
        width={1100}
        okText="Submit"
        confirmLoading={coordinatorSubmitLoading}
        onOk={() => coordinatorForm.submit()}
        maskClosable={false}
      >
        <Form form={coordinatorForm} layout="vertical" onFinish={handleCoordinatorSubmit}>
          <Row gutter={[16, 16]}>
            {COORDINATOR_ADD_FIELDS.filter((fieldName) => {
              if (userRole === 'scientist') {
                return !['quotation_given_by_department', 'center', 'group'].includes(fieldName)
              }
              return true
            }).map((fieldName) => {
              const field = ALL_FIELDS.find((f) => f.name === fieldName)
              if (!field) return null

              const isDate = ['enquiry_date', 'quote_date', 'revised_negotiated_quote_date'].includes(fieldName)
              const isTextArea = field.input === 'textarea'
              const isCustomerType = fieldName === 'customer_type'
              const isRequestType = fieldName === 'request_type'
              const isReadOnlyName = fieldName === 'quotation_given_by_name'
              const isReadOnlyDept = fieldName === 'quotation_given_by_department'
              const isReadOnlyCenter = fieldName === 'center'
              const isReadOnlyGroup = fieldName === 'group'
              const isCustomerName = fieldName === 'customer_name'

              return (
                <Col span={12} key={fieldName}>
                  <Form.Item
                    name={fieldName}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
                  >
                    {isDate ? (
                      <DatePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} />
                    ) : isCustomerType ? (
                      <Select placeholder="Select Customer Type">
                        {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : isRequestType ? (
                      <Select placeholder="Select Request Type">
                        {REQUEST_TYPE_OPTIONS.map((opt) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : isReadOnlyName || isReadOnlyDept || isReadOnlyCenter || isReadOnlyGroup ? (
                      <Input disabled />
                    ) : isCustomerName ? (
                      <AutoComplete
                        onSearch={searchCustomers}
                        options={customerOptions}
                        placeholder="Search/Enter Customer name"
                      />
                    ) : isTextArea ? (
                      <TextArea rows={3} />
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

      {/* Uploaded Documents (Version List) Modal */}
      <Modal
        title="Uploaded Documents"
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
        onCancel={() => {
          setViewDocumentUrl(null)
        }}
        footer={null}
        width={1100}
      >
        {(() => {
          const currentUrl = viewDocumentUrl || ''
          const urlNoQuery = currentUrl.split('#')[0].split('?')[0]
          const ext = (urlNoQuery.split('.').pop() || '').toLowerCase()
          const directPreviewable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt'].includes(ext)
          const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
          const isOffice = officeTypes.includes(ext)

          if (!currentUrl) return null

          // Office files - show download button (Office Online viewer can't access private URLs)
          if (isOffice) {
            return (
              <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold">
                  {ext.toUpperCase()} Document
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  This document type cannot be previewed directly. Please download to view.
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(currentUrl, '_blank')}
                  className="mt-4"
                >
                  Download Document
                </Button>
              </div>
            )
          }

          // PDF and images - use iframe preview
          if (directPreviewable) {
            return <iframe src={currentUrl} className="w-full h-[80vh]" title="Document" />
          }

          // Unknown file types - offer download
          return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
              <div className="text-6xl mb-4">📎</div>
              <h3 className="text-xl font-semibold">
                Document Preview
              </h3>
              <Button
                type="primary"
                size="large"
                onClick={() => window.open(currentUrl, '_blank')}
                className="mt-4"
              >
                Open Document
              </Button>
            </div>
          )
        })()}
      </Modal>
    </>
  )
}

export default ScientistProposals

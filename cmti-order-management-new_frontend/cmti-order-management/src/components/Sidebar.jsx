import { Layout, Menu, Button, Typography, message } from 'antd'
import {
  ProfileOutlined,
  SettingOutlined,
  ProjectOutlined,
  BarChartOutlined,
  BellOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons'
import cmtiLogo from '../assets/waitro-member-cmti.png'
import { useLocation, useNavigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

const { Sider } = Layout
const { Text } = Typography

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const segments = location.pathname.split('/').filter(Boolean)
  const basePath = (segments[0] || 'admin').toLowerCase()
  const normalizedBasePath = basePath
  const section = segments[1] || 'proposals'

  const selectedKey =
    section === 'configuration'
      ? 'configuration'
      : section === 'projects'
      ? 'projects'
      : section === 'analytics'
      ? 'analytics'
      : section === 'master-proposals'
      ? 'master-proposals'
      : section === 'notification'
      ? 'notification'
      : section === 'gh-master-proposals'
      ? 'gh-master-proposals'
      : section === 'gh-notification'
      ? 'gh-notification'
      : section === 'access-control'
      ? 'access-control'
      : 'proposals'

  let userName = ''
  let userRole = ''
  try {
    const rawUser = window.localStorage.getItem('ppm_user')
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser)
      if (parsedUser && parsedUser.name) {
        userName = parsedUser.name
      }
      if (parsedUser && parsedUser.role) {
        userRole = parsedUser.role
      }
    }
  } catch (error) {
    console.error('Failed to read user from localStorage', error)
  }

  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Treat Scientist the same as GH
    const isGHOrScientist = basePath === 'gh' || basePath === 'scientist'

    const fetchNotifications = () => {
      if (isGHOrScientist) {
        return axios.get(
          `${API_BASE_URL}/notifications/by-quotation-user/?name=${encodeURIComponent(userName || '')}`,
        )
      }
      return axios.get(
        `${API_BASE_URL}/notifications/?user_name=${encodeURIComponent(userName || '')}&role=${encodeURIComponent(userRole || '')}`
      )
    }

    const filterUnread = (items) => {
      const list = Array.isArray(items) ? items : []
      if (isGHOrScientist) {
        return list.filter(
          (notification) => notification.trigerred_by !== 'Coordinator' && notification.is_read !== 1,
        )
      }
      return list.filter(
        (notification) => notification.trigerred_by !== 'admin' && notification.is_read !== 1,
      )
    }

    fetchNotifications()
      .then((notificationsRes) => {
        const unreadCount = filterUnread(notificationsRes.data).length
        setNotificationCount(unreadCount)
      })
      .catch((error) => console.error('Error fetching notifications:', error));
  }, [normalizedBasePath, userName, userRole]);

  const handleLogout = () => {
    try {
      window.localStorage.removeItem('ppm_user')
      window.localStorage.removeItem('token')
    } catch (error) {
      console.error('Failed to clear user from localStorage', error)
    }
    message.success('Logged out')
    navigate('/')
  }

  // Treat Scientist the same as GH (basePath is already lowercase)
  const isGHOrScientist = basePath === 'gh' || basePath === 'scientist'

  return (
    <Sider
      width={260}
      className="bg-white shadow-lg flex flex-col justify-between"
      style={{ position: 'fixed', left: 0, top: 0, bottom: 0, height: '100vh', zIndex: 100 }}
    >
      <div>
        <div className="flex flex-col items-start gap-4 px-6 py-8 border-b border-slate-200">
          <div className="w-full flex items-center justify-center">
            <img
              src={cmtiLogo}
              alt="CMTI logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          {userName && (
            <div className="mt-2 w-full text-center">
              <Text type="secondary">Welcome</Text>
              <div>
                <Text strong>{userName}</Text>
              </div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(info) => {
            const prefix = `/${basePath}`

            if (info.key === 'configuration') navigate(`${prefix}/configuration`)
            else if (info.key === 'projects') navigate(`${prefix}/projects`)
            else if (info.key === 'analytics') navigate(`${prefix}/analytics`)
            else if (info.key === 'master-proposals') navigate(`${prefix}/master-proposals`)
            else if (info.key === 'gh-master-proposals') navigate(`${prefix}/gh-master-proposals`)
            else if (info.key === 'notification') navigate(`${prefix}/notification`)
            else if (info.key === 'gh-notification') navigate(`${prefix}/gh-notification`)
            else if (info.key === 'access-control') navigate(`${prefix}/access-control`)
            else navigate(`${prefix}/proposals`)
          }}
          items={[
            { key: 'proposals', icon: <ProfileOutlined />, label: 'Proposals / Projects' },
            { key: 'projects', icon: <ProjectOutlined />, label: 'Projects Documents' },

            ...(isGHOrScientist
              ? [
                  {
                    key: 'gh-master-proposals',
                    icon: <ProfileOutlined />,
                    label: 'Master Proposals',
                  },
                ]
              : []),

            ...(isGHOrScientist
              ? [
                  {
                    key: 'gh-notification',
                    icon: <ProfileOutlined />,
                    label: (
                      <span>
                        Notification
                        {notificationCount > 0 && (
                          <span
                            style={{
                              backgroundColor: '#ff4d4f',
                              borderRadius: '50%',
                              color: 'white',
                              padding: '0 6px',
                              marginLeft: '8px',
                              fontSize: '12px',
                            }}
                          >
                            {notificationCount}
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),  

            ...(normalizedBasePath === 'admin'
              ? [
                  {
                    key: 'master-proposals',
                    icon: <ProfileOutlined />,
                    label: 'Master Proposals',
                  },
                ]
              : []),

            ...(normalizedBasePath === 'admin' ? [{
                    key: 'analytics',
                    icon: <BarChartOutlined />,
                    label: 'Analytics'
            }] : []),

            ...(normalizedBasePath === 'admin'
              ? [
                  {
                    key: 'configuration',
                    icon: <SettingOutlined />,
                    label: 'Configuration',
                  },
                ]
              : []),

              ...(normalizedBasePath === 'admin'
              ? [
                  {
                    key: 'notification',
                    icon: <BellOutlined />, 
                    label: (
                      <span>
                        Notification
                        {notificationCount > 0 && (
                          <span style={{
                            backgroundColor: '#ff4d4f',
                            borderRadius: '50%',
                            color: 'white',
                            padding: '0 6px',
                            marginLeft: '8px',
                            fontSize: '12px'
                          }}>
                            {notificationCount}
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),

              ...(normalizedBasePath === 'admin'
              ? [
                  {
                    key: 'access-control',
                    icon: <UsergroupAddOutlined />, 
                    label: 'Access Control'
                  },
                ]
              : []),
          ]}
          className="text-base"
        />
      </div>
      <div className="px-4 pb-4 border-t border-slate-200 pt-3">
        <Button danger block onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </Sider>
  )
}

export default Sidebar
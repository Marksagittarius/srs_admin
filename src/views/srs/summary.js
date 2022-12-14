// project imports
import MainCard from 'ui-component/cards/MainCard';
import ListSubheader from '@mui/material/ListSubheader';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import StarBorder from '@mui/icons-material/StarBorder';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import ImageIcon from '@mui/icons-material/Image';

//react
import { useEffect, useState } from 'react';
import http from 'utils/ajax';
import config from 'configuration';
// ==============================|| SAMPLE PAGE ||============================== //

const baseURL = config.baseURL;

const SummaryPage = () => {
    const [open1, setOpen1] = useState(true);
    const [open2, setOpen2] = useState(true);
    const [open3, setOpen3] = useState(true);
    const [open4, setOpen4] = useState(true);

    const handleClick1 = () => {
        setOpen1(!open1);
    };
    const handleClick2 = () => {
        setOpen2(!open2);
    };
    const handleClick3 = () => {
        setOpen3(!open3);
    };
    const handleClick4 = () => {
        setOpen4(!open4);
    };

    const [runningTime, setRunningTime] = useState(0);
    const [CPUCondition, setCPUCondition] = useState('');
    const [memCondition, setMemCondition] = useState('');
    const [netCondition, setNetCondition] = useState('');
    const [osRunningTime, setOsRunningTime] = useState(0);
    const [osCPUCondition, setOsCPUCondition] = useState('');
    const [osMemCondition, setOsMemCondition] = useState('');
    const [osNetCondition, setOsNetCondition] = useState('');
    const [netIn, setNetIn] = useState('');
    const [netOut, setNetOut] = useState('');
    const [connection, setConnection] = useState('');
    const [disk, setDisk] = useState('');
    const [CPU, setCPU] = useState('');
    const [pid, setPid] = useState(0);
    const [ppid, setPpid] = useState(0);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        http.get(baseURL + '/api/v1/summaries').then((response) => {
            if (response !== null && response !== undefined) {
                let data = response.data;
                let self = data.self;
                let system = data.system;
                setRunningTime(data.now_ms + ' ms');
                setCPUCondition(self.cpu_percent + ' %');
                setMemCondition(self.mem_kbyte + ' b / ' + self.mem_percent + ' %');
                setNetCondition(self.srs_uptime + ' ms');
                setOsRunningTime(system.srs_sample_time + ' ms');
                setOsMemCondition(system.mem_ram_kbyte + ' b / ' + system.mem_ram_percent + ' %');
                setOsCPUCondition(system.cpu_percent + ' %');
                setOsNetCondition(system.srs_recv_bytes + ' b / ' + system.srs_send_bytes + ' b');
                setNetIn(system.srs_recv_bytes + ' b / ' + system.srs_send_bytes + ' b');
                setNetOut(system.srs_recvi_bytes + ' b / ' + system.srs_sendi_bytes + ' b');
                setConnection(system.conn_sys + ' / ' + system.conn_sys_et + ' / ' + system.conn_sys_tw + ' / ' + system.conn_sys_udp);
                setDisk(system.disk_read_KBps + ' KB / ' + system.disk_write_KBps + 'KB / ' + system.disk_busy_percent + ' %');
                setCPU(system.cpus + ' / ' + system.cpus_online);
                setPid(data.self.pid);
                setPpid(data.self.ppid);
                setReady(data.ok);
            }
        });
    });

    return (
        <MainCard title="?????????????????????">
            <List
                sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
                component="nav"
                aria-labelledby="nested-list-subheader"
                subheader={
                    <ListSubheader component="div" id="nested-list-subheader">
                        SRS?????????????????????
                    </ListSubheader>
                }
            >
                <ListItemButton onClick={handleClick1}>
                    <ListItemIcon>
                        <InboxIcon />
                    </ListItemIcon>
                    <ListItemText primary="SRS/4.0.257" />
                    {open1 ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={open1} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={runningTime} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="CPU" secondary={CPUCondition} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={memCondition} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={netCondition} />
                        </ListItemButton>
                    </List>
                </Collapse>
                <ListItemButton onClick={handleClick2}>
                    <ListItemIcon>
                        <InboxIcon />
                    </ListItemIcon>
                    <ListItemText primary="OS??????" />
                    {open2 ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={open2} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={osRunningTime} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="CPU" secondary={osCPUCondition} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={osMemCondition} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={osNetCondition} />
                        </ListItemButton>
                    </List>
                </Collapse>
                <ListItemButton onClick={handleClick3}>
                    <ListItemIcon>
                        <InboxIcon />
                    </ListItemIcon>
                    <ListItemText primary="????????????" />
                    {open3 ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={open3} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={netIn} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={netOut} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={connection} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="??????" secondary={disk} />
                        </ListItemButton>
                    </List>
                </Collapse>
                <ListItemButton onClick={handleClick4}>
                    <ListItemIcon>
                        <InboxIcon />
                    </ListItemIcon>
                    <ListItemText primary="????????????" />
                    {open4 ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={open4} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="CPU" secondary={CPU} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="PID" secondary={pid} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="PPID" secondary={ppid} />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 4 }}>
                            <ListItemAvatar>
                                <Avatar>
                                    <ImageIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary="Ready" secondary={ready ? 'true' : 'false'} />
                        </ListItemButton>
                    </List>
                </Collapse>
            </List>
        </MainCard>
    );
};

export default SummaryPage;

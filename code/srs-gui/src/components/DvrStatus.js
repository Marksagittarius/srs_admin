import React from "react";
import { useNavigate } from "react-router-dom";
import { Errors, Token } from "../utils";
import axios from "axios";
import { MGMT_HOST, MGMT_PORT, addURLPrefix } from "../config";

export default function useDvrVodStatus() {
    const navigate = useNavigate();
    const [vodStatus, setVodStatus] = React.useState();
    const [dvrStatus, setDvrStatus] = React.useState();

    React.useEffect(() => {
        const token = Token.load();
        axios.post(addURLPrefix(MGMT_HOST, MGMT_PORT, '/terraform/v1/hooks/vod/query'), {
            ...token,
        }).then(res => {
            console.log(`VodPattern: Query ok, ${JSON.stringify(res.data.data)}`);
            setVodStatus(res.data.data);
        }).catch(e => {
            const err = e.response.data;
            if (err.code === Errors.auth) {
                alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
                navigate('/routers-logout');
            } else {
                alert(`服务器错误，${err.code}: ${err.data.message}`);
            }
        });
    }, [navigate]);

    React.useEffect(() => {
        const token = Token.load();
        axios.post(addURLPrefix(MGMT_HOST, MGMT_PORT, '/terraform/v1/hooks/dvr/query'), {
            ...token,
        }).then(res => {
            console.log(`DvrPattern: Query ok, ${JSON.stringify(res.data.data)}`);
            setDvrStatus(res.data.data);
        }).catch(e => {
            const err = e.response.data;
            if (err.code === Errors.auth) {
                alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
                navigate('/routers-logout');
            } else {
                alert(`服务器错误，${err.code}: ${err.data.message}`);
            }
        });
    }, [navigate]);

    return [dvrStatus, vodStatus];
}

export function useRecordStatus() {
    const navigate = useNavigate();
    const [recordStatus, setRecordStatus] = React.useState();

    React.useEffect(() => {
        const token = Token.load();
        axios.post(addURLPrefix(MGMT_HOST, MGMT_PORT, '/terraform/v1/hooks/record/query'), {
            ...token,
        }).then(res => {
            console.log(`RecordPattern: Query ok, ${JSON.stringify(res.data.data)}`);
            setRecordStatus(res.data.data);
        }).catch(e => {
            const err = e.response.data;
            if (err.code === Errors.auth) {
                alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
                navigate('/routers-logout');
            } else {
                alert(`服务器错误，${err.code}: ${err.data.message}`);
            }
        });
    }, [navigate]);

    return recordStatus;
}


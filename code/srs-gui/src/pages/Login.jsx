import React from "react";
import Container from "react-bootstrap/Container";
import { Form, Button } from 'react-bootstrap';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Token, Tools } from '../utils';
import { SrsErrorBoundary } from "../components/SrsErrorBoundary";
import { useErrorHandler } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { MGMT_HOST, MGMT_PORT, addURLPrefix } from "../config";

export default function Login({ onLogin }) {
    return (
        <SrsErrorBoundary>
            <LoginImpl onLogin={onLogin} />
        </SrsErrorBoundary>
    );
}

function LoginImpl({ onLogin }) {
    const [plaintext, setPlaintext] = React.useState(true);
    const [password, setPassword] = React.useState();
    const navigate = useNavigate();
    const passwordRef = React.useRef();
    const plaintextRef = React.useRef();
    const handleError = useErrorHandler();
    const { t } = useTranslation();

    // Verify the token if exists.
    React.useEffect(() => {
        const token = Token.load();
        if (!token || !token.token) return;

        console.log(`Login: Verify, token is ${Tools.mask(token)}`);
        axios.post(addURLPrefix(MGMT_HOST, MGMT_PORT, '/terraform/v1/mgmt/token'), {
            ...token,
        }).then(res => {
            console.log(`Login: Done, token is ${Tools.mask(token)}`);
            navigate('/routers-scenario');
        }).catch(handleError);
    }, [navigate, handleError]);

    // Focus to password input.
    React.useEffect(() => {
        plaintext ? plaintextRef.current?.focus() : passwordRef.current?.focus();
    }, [plaintext]);

    // User click login button.
    // Note that we use callback, because when we use it in other hooks, it might be null, for example, to use handleLogin
    // in useEffect, which should depends on the hooks, but should never depends on RAW function, because it always
    // changes its value. See https://stackoverflow.com/a/55854902/17679565
    const handleLogin = React.useCallback((e) => {
        e.preventDefault();

        axios.post(addURLPrefix(MGMT_HOST, MGMT_PORT, '/terraform/v1/mgmt/login'), {
            password,
        }).then(res => {
            const data = res.data.data;
            console.log(`Login: OK, token is ${Tools.mask(data)}`);
            Token.save(data);

            onLogin && onLogin();
            navigate('/routers-scenario');
        }).catch(handleError);
    }, [password, handleError, onLogin, navigate]);

    return (
        <>
            <Container>
                <Form>
                    <Form.Group className="mb-3" controlId="formBasicPassword">
                        <Form.Label>{t('login.passwordLabel')}</Form.Label>
                        {
                            !plaintext &&
                            <Form.Control type="password" placeholder="Password" ref={passwordRef} defaultValue={password}
                                onChange={(e) => setPassword(e.target.value)} />
                        }
                        {
                            plaintext &&
                            <Form.Control type="text" placeholder="Password" ref={plaintextRef} defaultValue={password}
                                onChange={(e) => setPassword(e.target.value)} />
                        }
                        <Form.Text className="text-muted">
                            * {t('login.passwordTip')}
                        </Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formBasicCheckbox">
                        <Form.Check type="checkbox" label={t('login.labelShow')} defaultChecked={plaintext}
                            onClick={() => setPlaintext(!plaintext)} />
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => handleLogin(e)}>
                        {t('login.labelLogin')}
                    </Button>
                </Form>
            </Container>
        </>
    );
}


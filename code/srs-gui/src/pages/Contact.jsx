import React from "react";
import { Container, Carousel } from "react-bootstrap";
import srsCloud from "../resources/srs-cloud-1296x648.png";
import srsVideo from "../resources/srs-xingqiu-1296x648.png";
import { useSrsLanguage } from "../components/LanguageSwitch";

export default function Contact() {
    const language = useSrsLanguage();
    return language === 'zh' ? <ContactCn /> : <ContactEn />;
}

function ContactCn() {
    return (
        <Container>
            <Carousel variant="dark" interval={null}>
                <Carousel.Item>
                    <img
                        className="d-block w-100"
                        src={srsVideo}
                        alt="SRS付费星球"
                    />
                    <Carousel.Caption>
                        <h5>欢迎加入SRS付费星球</h5>
                        <p>
                            加入SRS付费星球后，可以和SRS维护者建立直接和长期的联系；还有每月一次线上交流的机会；也可以提疑惑和需求，我们会慎重和优先考虑。
                        </p>
                    </Carousel.Caption>
                </Carousel.Item>
                <Carousel.Item>
                    <img
                        className="d-block w-100"
                        src={srsCloud}
                        alt="SRS云服务器"
                    />
                    <Carousel.Caption>
                        <h5>欢迎加云SRS微信群</h5>
                        <p>
                            欢迎加群探讨使用经验，寻求帮助，请先观看<a href='https://www.bilibili.com/video/BV1844y1L7dL/' target='_blank' rel='noreferrer'>视频入门教程</a>。<br />
                            提需求或咨询，请加SRS付费星球。
                        </p>
                    </Carousel.Caption>
                </Carousel.Item>
            </Carousel>
        </Container>
    );
}

function ContactEn() {
    return (
        <Container>
            Welcome to contact us by:
            <ul>
                <li>
                    Discord:
                    <a href='https://discord.gg/yZ4BnPmHAd' target='_blank' rel='noreferrer'>
                        https://discord.gg/yZ4BnPmHAd
                    </a>
                </li>
                <li>
                    Twitter:
                    <a href='https://twitter.com/srs_server' target='_blank' rel='noreferrer'>
                        https://twitter.com/srs_server
                    </a>
                </li>
                <li>
                    GitHub:
                    <a href='https://github.com/ossrs/srs' target='_blank' rel='noreferrer'>
                        https://github.com/ossrs/srs
                    </a>
                </li>
            </ul>
        </Container>
    );
}

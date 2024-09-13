import { Link } from "react-router-dom";
import {
  FooterSection,
  MainFooterContainer,
  MadeByContainer,
  QuestionAndSupport,
  Mail,
  TACAndPP,
  Heading,
} from "./styledComponents.js";

const Footer = () => {
  return (
    <FooterSection>
      <MadeByContainer>
        <Heading madeBy>Made by</Heading>
        <Heading name>BBK</Heading>
      </MadeByContainer>
      <MainFooterContainer>
        <QuestionAndSupport>
          <Heading as={"h2"}>Question + Support</Heading>
          <Mail>youtubeproxy@gmail.com</Mail>
        </QuestionAndSupport>
        <TACAndPP>
          <Heading small>
            <Link
              to="/terms_of_service"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              TERMS AND CONDITIONS
            </Link>
          </Heading>
          <Heading small>
            <Link
              to="/privacy_policy"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              PRIVACY POLICY
            </Link>
          </Heading>
        </TACAndPP>
      </MainFooterContainer>
    </FooterSection>
  );
};

export default Footer;

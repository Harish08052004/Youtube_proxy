import styled from "styled-components";

export const FooterSection = styled.div`
  padding: min(5vw, 5vh);
  background-color: black;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media screen and (min-width: 576px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 10vw;
  }
`;

export const MainFooterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: min(8vh, 8vw);

  @media screen and (min-width: 576px) {
    flex-grow: 1;
  }
`;

export const MadeByContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  column-gap: 1rem;
`;

export const Heading = styled.h5`
  opacity: ${(props) => (props.name ? "1" : "0.5")};
  font-weight: 450;
  font-size: ${(props) => {
    if (props.madeBy) {
      return "1rem";
    } else if (props.name) {
      return "1.5rem";
    } else {
      return "0.8rem";
    }
  }};
  line-height: 1.5;
  font-weight: ${(props) => props.name && "bold"};
  position: relative;
  display: inline-block;
  padding: 0.5rem 0;
  cursor: pointer;

  ${(props) =>
    (props.small || props.name) &&
    `
    &::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 0;
      height: 1px;
      background-color: white;
      transition: width 0.3s ease, left 0.3s ease;
    }

    &:hover::after {
      width: 100%;
      left: 0;
    }
  `}
`;

export const QuestionAndSupport = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media screen and (min-width: 576px) {
    text-align: start;
    align-items: flex-start;
  }
`;

export const Mail = styled.p`
  opacity: 1;
  font-weight: 500;
  font-size: 1.2rem;
  position: relative;
  display: inline-block;
  padding-bottom: 0.5rem;
  cursor: pointer;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 0;
    height: 1px;
    background-color: white;
    transition: width 0.3s ease, left 0.3s ease;
  }

  &:hover::after {
    width: 100%;
    left: 0;
  }
`;

export const TACAndPP = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding-top: 0.8rem;
  border-top: solid 1px gray;
`;

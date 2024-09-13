import { Component } from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import Home from "./components/Home";
import EditorSection from "./components/EditorSection";
import CreatorSection from "./components/CreatorSection";
import CreatorRequestDetails from "./components/CreatorRequestDetails";
import EditorRequestDetails from "./components/EditorRequestDetails";
import RequestSection from "./components/RequestSection";
import Login from "./components/Login";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import ProtectedRoute from "./components/ProtectedRoute";
import LanguageAndAccessibilityContext from "./context/languageAndAccessibilityContext";
import { toast } from "react-toastify";
import "./App.css";

class App extends Component {
  state = {
    activeLanguage: "EN",
    fontSizeRatio: 1,
    showInGray: false,
    showUnderLines: false,
  };

  changeLanguage = (newLanguage) => {
    this.setState({
      activeLanguage: newLanguage,
    });
  };

  increaseRatio = () => {
    const { fontSizeRatio } = this.state;
    if (fontSizeRatio <= 1.3) {
      this.setState((prevState) => ({
        fontSizeRatio: prevState.fontSizeRatio + 0.15,
      }));
    } else {
      return toast.warn("Maximum size reached");
    }
  };

  decreaseRatio = () => {
    const { fontSizeRatio } = this.state;
    if (fontSizeRatio >= 0.7) {
      this.setState((prevState) => ({
        fontSizeRatio: prevState.fontSizeRatio - 0.15,
      }));
    } else {
      return toast.warn("Minimum size reached");
    }
  };

  toggleGrayScale = () => {
    this.setState((prevState) => ({
      showInGray: !prevState.showInGray,
    }));
  };

  toggleUnderLines = () => {
    this.setState((prevState) => ({
      showUnderLines: !prevState.showUnderLines,
    }));
  };

  resetSettings = () => {
    this.setState({
      fontSizeRatio: 1,
      showInGray: false,
      showUnderLines: false,
    });
  };

  render() {
    const { activeLanguage, fontSizeRatio, showInGray, showUnderLines } =
      this.state;

    return (
      <BrowserRouter>
        <LanguageAndAccessibilityContext.Provider
          value={{
            activeLanguage,
            changeLanguage: this.changeLanguage,
            fontSizeRatio,
            increaseRatio: this.increaseRatio,
            decreaseRatio: this.decreaseRatio,
            showInGray,
            toggleGrayScale: this.toggleGrayScale,
            showUnderLines,
            toggleUnderLines: this.toggleUnderLines,
            resetSettings: this.resetSettings,
          }}
        >
          <Switch>
            <ProtectedRoute exact path="/" component={Home} />
            <Route exact path="/login" component={Login} />
            <ProtectedRoute
              exact
              path="/creator_section"
              component={CreatorSection}
            />
            <ProtectedRoute
              exact
              path="/editor_section"
              component={EditorSection}
            />
            <ProtectedRoute
              exact
              path="/creator_section/:videoId"
              component={CreatorRequestDetails}
            />

            <ProtectedRoute
              exact
              path="/request_section"
              component={RequestSection}
            />
            <ProtectedRoute
              exact
              path="/editor_section/:videoId"
              component={EditorRequestDetails}
            />
            <Route exact path="/privacy_policy" component={PrivacyPolicy} />
            <Route exact path="/terms_of_service" component={TermsOfService} />
          </Switch>
        </LanguageAndAccessibilityContext.Provider>
      </BrowserRouter>
    );
  }
}

export default App;

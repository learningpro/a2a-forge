use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum AssertionType {
    StatusEquals,
    JsonPathEquals,
    JsonPathExists,
    JsonPathContains,
    JsonPathMatches,
    ResponseTimeLt,
    ContainsMedia,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Assertion {
    pub id: String,
    #[serde(rename = "type")]
    pub assertion_type: AssertionType,
    pub path: Option<String>,
    pub expected: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AssertionResult {
    pub assertion_id: String,
    pub passed: bool,
    pub actual: Option<String>,
    pub message: String,
}

/// Evaluate all assertions against a response.
pub fn evaluate_assertions(
    response: &serde_json::Value,
    assertions: &[Assertion],
    duration_ms: i32,
) -> Vec<AssertionResult> {
    assertions.iter().map(|a| evaluate_one(response, a, duration_ms)).collect()
}

fn evaluate_one(
    response: &serde_json::Value,
    assertion: &Assertion,
    duration_ms: i32,
) -> AssertionResult {
    match assertion.assertion_type {
        AssertionType::StatusEquals => eval_status_equals(response, assertion),
        AssertionType::JsonPathEquals => eval_json_path_equals(response, assertion),
        AssertionType::JsonPathExists => eval_json_path_exists(response, assertion),
        AssertionType::JsonPathContains => eval_json_path_contains(response, assertion),
        AssertionType::JsonPathMatches => eval_json_path_matches(response, assertion),
        AssertionType::ResponseTimeLt => eval_response_time(assertion, duration_ms),
        AssertionType::ContainsMedia => eval_contains_media(response, assertion),
    }
}

fn extract_task_state(response: &serde_json::Value) -> Option<String> {
    let result = response.get("result")?;
    if let Some(state) = result.get("status").and_then(|s| s.get("state")).and_then(|v| v.as_str()) {
        return Some(state.to_string());
    }
    result.get("status").and_then(|v| v.as_str()).map(|s| s.to_string())
}

fn eval_status_equals(response: &serde_json::Value, assertion: &Assertion) -> AssertionResult {
    let expected = assertion.expected.as_deref().unwrap_or("completed");
    let actual = extract_task_state(response);
    let passed = actual.as_deref() == Some(expected);
    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual: actual.clone(),
        message: if passed {
            format!("Status is '{expected}'")
        } else {
            format!("Expected status '{expected}', got '{}'", actual.unwrap_or_else(|| "null".into()))
        },
    }
}

fn query_json_path(response: &serde_json::Value, path: &str) -> Result<serde_json::Value, String> {
    use jsonpath_rust::JsonPath;
    let jp: JsonPath = path.parse().map_err(|e| format!("Invalid JSONPath: {e}"))?;
    let results = jp.find(response);
    if results.is_null() || (results.is_array() && results.as_array().map_or(true, |a| a.is_empty())) {
        Err(format!("Path '{path}' not found"))
    } else if let Some(arr) = results.as_array() {
        Ok(arr[0].clone())
    } else {
        Ok(results)
    }
}

fn value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn eval_json_path_equals(response: &serde_json::Value, assertion: &Assertion) -> AssertionResult {
    let path = assertion.path.as_deref().unwrap_or("$");
    let expected = assertion.expected.as_deref().unwrap_or("");
    match query_json_path(response, path) {
        Ok(val) => {
            let actual = value_to_string(&val);
            let passed = actual == expected;
            AssertionResult {
                assertion_id: assertion.id.clone(),
                passed,
                actual: Some(actual.clone()),
                message: if passed {
                    format!("{path} equals '{expected}'")
                } else {
                    format!("{path}: expected '{expected}', got '{actual}'")
                },
            }
        }
        Err(msg) => AssertionResult {
            assertion_id: assertion.id.clone(),
            passed: false,
            actual: None,
            message: msg,
        },
    }
}

fn eval_json_path_exists(response: &serde_json::Value, assertion: &Assertion) -> AssertionResult {
    let path = assertion.path.as_deref().unwrap_or("$");
    let exists = query_json_path(response, path).is_ok();
    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed: exists,
        actual: Some(exists.to_string()),
        message: if exists {
            format!("{path} exists")
        } else {
            format!("{path} does not exist")
        },
    }
}

fn eval_json_path_contains(response: &serde_json::Value, assertion: &Assertion) -> AssertionResult {
    let path = assertion.path.as_deref().unwrap_or("$");
    let expected = assertion.expected.as_deref().unwrap_or("");
    match query_json_path(response, path) {
        Ok(val) => {
            let actual = value_to_string(&val);
            let passed = actual.contains(expected);
            AssertionResult {
                assertion_id: assertion.id.clone(),
                passed,
                actual: Some(actual.clone()),
                message: if passed {
                    format!("{path} contains '{expected}'")
                } else {
                    format!("{path}: '{actual}' does not contain '{expected}'")
                },
            }
        }
        Err(msg) => AssertionResult {
            assertion_id: assertion.id.clone(),
            passed: false,
            actual: None,
            message: msg,
        },
    }
}

fn eval_json_path_matches(response: &serde_json::Value, assertion: &Assertion) -> AssertionResult {
    let path = assertion.path.as_deref().unwrap_or("$");
    let pattern = assertion.expected.as_deref().unwrap_or("");
    match query_json_path(response, path) {
        Ok(val) => {
            let actual = value_to_string(&val);
            let re_result = regex::Regex::new(pattern);
            match re_result {
                Ok(re) => {
                    let passed = re.is_match(&actual);
                    AssertionResult {
                        assertion_id: assertion.id.clone(),
                        passed,
                        actual: Some(actual.clone()),
                        message: if passed {
                            format!("{path} matches /{pattern}/")
                        } else {
                            format!("{path}: '{actual}' does not match /{pattern}/")
                        },
                    }
                }
                Err(e) => AssertionResult {
                    assertion_id: assertion.id.clone(),
                    passed: false,
                    actual: Some(actual),
                    message: format!("Invalid regex '{pattern}': {e}"),
                },
            }
        }
        Err(msg) => AssertionResult {
            assertion_id: assertion.id.clone(),
            passed: false,
            actual: None,
            message: msg,
        },
    }
}

fn eval_response_time(assertion: &Assertion, duration_ms: i32) -> AssertionResult {
    let threshold: i32 = assertion.expected.as_deref().unwrap_or("30000").parse().unwrap_or(30000);
    let passed = duration_ms < threshold;
    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed,
        actual: Some(format!("{duration_ms}ms")),
        message: if passed {
            format!("Response time {duration_ms}ms < {threshold}ms")
        } else {
            format!("Response time {duration_ms}ms >= {threshold}ms threshold")
        },
    }
}

fn eval_contains_media(response: &serde_json::Value, assertion: &Assertion) -> AssertionResult {
    let json_str = response.to_string();
    let media_patterns = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
        ".mp4", ".webm", ".mov",
        ".mp3", ".wav", ".ogg",
        "data:image/", "data:video/", "data:audio/",
    ];
    let found = media_patterns.iter().any(|p| json_str.contains(p));
    AssertionResult {
        assertion_id: assertion.id.clone(),
        passed: found,
        actual: Some(found.to_string()),
        message: if found {
            "Response contains media URL".into()
        } else {
            "No media URL found in response".into()
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_assertion(t: AssertionType, path: Option<&str>, expected: Option<&str>) -> Assertion {
        Assertion {
            id: "test".into(),
            assertion_type: t,
            path: path.map(|s| s.into()),
            expected: expected.map(|s| s.into()),
            description: None,
        }
    }

    #[test]
    fn test_status_equals_pass() {
        let resp = serde_json::json!({"result": {"status": {"state": "completed"}}});
        let a = make_assertion(AssertionType::StatusEquals, None, Some("completed"));
        let r = evaluate_one(&resp, &a, 100);
        assert!(r.passed);
    }

    #[test]
    fn test_status_equals_fail() {
        let resp = serde_json::json!({"result": {"status": {"state": "failed"}}});
        let a = make_assertion(AssertionType::StatusEquals, None, Some("completed"));
        let r = evaluate_one(&resp, &a, 100);
        assert!(!r.passed);
    }

    #[test]
    fn test_json_path_exists() {
        let resp = serde_json::json!({"result": {"artifacts": [{"url": "http://example.com/img.png"}]}});
        let a = make_assertion(AssertionType::JsonPathExists, Some("$.result.artifacts[0].url"), None);
        let r = evaluate_one(&resp, &a, 100);
        assert!(r.passed);
    }

    #[test]
    fn test_json_path_not_exists() {
        let resp = serde_json::json!({"result": {}});
        let a = make_assertion(AssertionType::JsonPathExists, Some("$.result.artifacts[0].url"), None);
        let r = evaluate_one(&resp, &a, 100);
        assert!(!r.passed);
    }

    #[test]
    fn test_response_time_pass() {
        let a = make_assertion(AssertionType::ResponseTimeLt, None, Some("5000"));
        let r = evaluate_one(&serde_json::json!({}), &a, 3000);
        assert!(r.passed);
    }

    #[test]
    fn test_response_time_fail() {
        let a = make_assertion(AssertionType::ResponseTimeLt, None, Some("1000"));
        let r = evaluate_one(&serde_json::json!({}), &a, 3000);
        assert!(!r.passed);
    }

    #[test]
    fn test_contains_media() {
        let resp = serde_json::json!({"result": {"url": "https://cdn.example.com/image.png"}});
        let a = make_assertion(AssertionType::ContainsMedia, None, None);
        let r = evaluate_one(&resp, &a, 100);
        assert!(r.passed);
    }
}

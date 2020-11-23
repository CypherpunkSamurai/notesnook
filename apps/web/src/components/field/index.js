import React, { useState } from "react";
import { Flex } from "rebass";
import { Input, Label } from "@rebass/forms";
import * as Icon from "../icons";

function Field(props) {
  const {
    id,
    label,
    type,
    sx,
    name,
    required,
    autoFocus,
    autoComplete,
    helpText,
    action,
    onKeyUp,
    onChange,
    inputRef,
    defaultValue,
  } = props;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <Flex sx={sx} flexDirection="column">
      <Label
        htmlFor={id}
        sx={{
          fontSize: "subtitle",
          fontWeight: "bold",
          color: "text",
        }}
      >
        {label}
      </Label>
      {helpText && (
        <Label htmlFor={id} sx={{ fontSize: "subBody", color: "gray" }}>
          {helpText}
        </Label>
      )}
      <Flex mt={1} sx={{ position: "relative" }}>
        <Input
          data-test-id={props["data-test-id"]}
          defaultValue={defaultValue}
          ref={inputRef}
          autoFocus={autoFocus}
          required={required}
          name={name}
          id={id}
          autoComplete={autoComplete}
          type={type || "text"}
          onChange={onChange}
          onKeyUp={onKeyUp}
        />
        {type === "password" && (
          <Flex
            onClick={() => {
              const input = document.getElementById(id);
              input.type = isPasswordVisible ? "password" : "text";
              setIsPasswordVisible((s) => !s);
            }}
            variant="rowCenter"
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              px: 1,
              borderRadius: "default",
              ":hover": { bg: "border" },
            }}
          >
            {isPasswordVisible ? (
              <Icon.PasswordVisible />
            ) : (
              <Icon.PasswordInvisible />
            )}
          </Flex>
        )}
        {action && (
          <Flex
            onClick={action.onClick}
            variant="rowCenter"
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              px: 1,
              borderRadius: "default",
              ":hover": { bg: "border" },
            }}
          >
            <action.icon />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

export default Field;

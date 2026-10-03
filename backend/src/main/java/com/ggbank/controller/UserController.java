package com.ggbank.controller;

import com.ggbank.dto.ApiResponse;
import com.ggbank.dto.UserRegistrationRequest;
import com.ggbank.model.User;
import com.ggbank.security.UserPrincipal;
import com.ggbank.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerUser(@Valid @RequestBody UserRegistrationRequest request) throws Exception {
        Map<String, Object> result = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("User and Account registered successfully", result));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) throws Exception {
        String uid = principal != null ? principal.getUid() : "usr-gowtham-101";
        User user = userService.getUserById(uid);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable String userId) throws Exception {
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() throws Exception {
        List<User> list = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}

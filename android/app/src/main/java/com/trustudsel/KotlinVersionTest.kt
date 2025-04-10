package com.trustudsel

// This is a simple Kotlin 2.0 class to test if the Kotlin version is working properly
class KotlinVersionTest {
    // Kotlin 2.0 feature: value classes
    @JvmInline
    value class UserId(val id: String)
    
    fun test() {
        // Use a Kotlin 2.0 feature
        val user = UserId("test-user")
        println("User ID: ${user.id}")
    }
} 
package com.example.familylocator

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class Member(val uid: String, val name: String, val lat: Double, val lng: Double, val ts: Long, val sos: Boolean)
data class Place(val id: String, val name: String, val lat: Double, val lng: Double, val radius: Double)
data class Event(val id: String, val uid: String, val name: String, val place: String, val type: String, val ts: Long)
data class HistoryPoint(val lat: Double, val lng: Double, val ts: Long)

fun Event.text() = "$name ${if (type == "enter") "arrived at" else "left"} $place"

object Repo {
    val auth: FirebaseAuth get() = FirebaseAuth.getInstance()
    private val db get() = FirebaseFirestore.getInstance()
    private val uid get() = auth.currentUser!!.uid
    val myUid: String? get() = auth.currentUser?.uid

    private var cachedName: String? = null
    private var cachedCircle: String? = null

    suspend fun signIn(email: String, pw: String): String {
        auth.signInWithEmailAndPassword(email, pw).await()
        return uid
    }

    suspend fun signUp(email: String, pw: String, name: String): String {
        auth.createUserWithEmailAndPassword(email, pw).await()
        db.collection("users").document(uid).set(mapOf("name" to name)).await()
        return uid
    }

    suspend fun myCircleId(): String? {
        val d = db.collection("users").document(uid).get().await()
        cachedName = d.getString("name")
        cachedCircle = d.getString("circleId")
        return cachedCircle
    }

    suspend fun createCircle(name: String): String {
        val code = (1..6).map { "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".random() }.joinToString("")
        db.collection("circles").document(code).set(mapOf("name" to name, "owner" to uid)).await()
        db.collection("users").document(uid).update("circleId", code).await()
        cachedCircle = code
        return code
    }

    suspend fun joinCircle(code: String): Boolean {
        val c = code.trim().uppercase()
        if (!db.collection("circles").document(c).get().await().exists()) return false
        db.collection("users").document(uid).update("circleId", c).await()
        cachedCircle = c
        return true
    }

    suspend fun pushLocation(lat: Double, lng: Double) {
        if (cachedCircle == null) myCircleId()
        val circle = cachedCircle ?: return
        db.collection("locations").document(uid).set(
            mapOf("lat" to lat, "lng" to lng, "ts" to System.currentTimeMillis(),
                "name" to (cachedName ?: "Me"), "circleId" to circle),
            SetOptions.merge()
        ).await()
    }

    suspend fun setSos(on: Boolean) {
        db.collection("locations").document(uid).set(mapOf("sos" to on), SetOptions.merge()).await()
    }

    fun members(circleId: String): Flow<List<Member>> = callbackFlow {
        val reg = db.collection("locations").whereEqualTo("circleId", circleId)
            .addSnapshotListener { snap, _ ->
                if (snap != null) trySend(snap.documents.map { d ->
                    Member(d.id, d.getString("name") ?: "?", d.getDouble("lat") ?: 0.0,
                        d.getDouble("lng") ?: 0.0, d.getLong("ts") ?: 0L, d.getBoolean("sos") ?: false)
                })
            }
        awaitClose { reg.remove() }
    }

    // ---------- History ----------
    suspend fun pushHistory(lat: Double, lng: Double) {
        val circle = cachedCircle ?: return
        val now = System.currentTimeMillis()
        val day = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(now))
        db.collection("history").add(
            mapOf("uid" to uid, "circleId" to circle, "lat" to lat, "lng" to lng, "ts" to now, "day" to day)
        ).await()
    }

    suspend fun history(memberUid: String, day: String): List<HistoryPoint> =
        db.collection("history").whereEqualTo("uid", memberUid).whereEqualTo("day", day)
            .get().await().documents.mapNotNull { d ->
                val la = d.getDouble("lat"); val lo = d.getDouble("lng"); val t = d.getLong("ts")
                if (la != null && lo != null && t != null) HistoryPoint(la, lo, t) else null
            }.sortedBy { it.ts }

    // ---------- Places (geofences) ----------
    private fun placesCol(c: String) = db.collection("circles").document(c).collection("places")
    private fun eventsCol(c: String) = db.collection("circles").document(c).collection("events")

    suspend fun addPlace(name: String, lat: Double, lng: Double, radius: Double) {
        val c = cachedCircle ?: myCircleId() ?: return
        placesCol(c).add(mapOf("name" to name, "lat" to lat, "lng" to lng, "radius" to radius)).await()
    }

    suspend fun deletePlace(id: String) {
        val c = cachedCircle ?: return
        placesCol(c).document(id).delete().await()
    }

    fun places(circleId: String): Flow<List<Place>> = callbackFlow {
        val reg = placesCol(circleId).addSnapshotListener { snap, _ ->
            if (snap != null) trySend(snap.documents.map { d ->
                Place(d.id, d.getString("name") ?: "Place", d.getDouble("lat") ?: 0.0,
                    d.getDouble("lng") ?: 0.0, d.getDouble("radius") ?: 150.0)
            })
        }
        awaitClose { reg.remove() }
    }

    suspend fun addEvent(place: Place, type: String) {
        val c = cachedCircle ?: return
        eventsCol(c).add(
            mapOf("uid" to uid, "name" to (cachedName ?: "Someone"), "place" to place.name,
                "type" to type, "ts" to System.currentTimeMillis())
        ).await()
    }

    fun events(circleId: String): Flow<List<Event>> = callbackFlow {
        val reg = eventsCol(circleId).orderBy("ts", Query.Direction.DESCENDING).limit(50)
            .addSnapshotListener { snap, _ ->
                if (snap != null) trySend(snap.documents.map { d ->
                    Event(d.id, d.getString("uid") ?: "", d.getString("name") ?: "?",
                        d.getString("place") ?: "", d.getString("type") ?: "enter", d.getLong("ts") ?: 0L)
                })
            }
        awaitClose { reg.remove() }
    }

    fun signOut() { cachedName = null; cachedCircle = null; auth.signOut() }
}

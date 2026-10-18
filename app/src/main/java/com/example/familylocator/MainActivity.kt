package com.example.familylocator

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import org.osmdroid.util.BoundingBox
import org.osmdroid.views.overlay.Polygon
import org.osmdroid.views.overlay.Polyline
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Configuration.getInstance().apply {
            load(this@MainActivity, getSharedPreferences("osmdroid_prefs", MODE_PRIVATE))
            userAgentValue = packageName
        }
        setContent { MaterialTheme { Surface(Modifier.fillMaxSize()) { App() } } }
    }
}

@Composable
fun App() {
    val ctx = LocalContext.current
    var uid by remember { mutableStateOf(Repo.auth.currentUser?.uid) }
    var circle by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(uid) {
        loading = true
        circle = if (uid != null) runCatching { Repo.myCircleId() }.getOrNull() else null
        loading = false
    }

    when {
        loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        uid == null -> AuthScreen { uid = it }
        circle == null -> CircleScreen { circle = it }
        else -> Home(circle!!) {
            ctx.stopService(Intent(ctx, LocationService::class.java))
            Repo.signOut(); uid = null; circle = null
        }
    }
}

@Composable
fun AuthScreen(onDone: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var pw by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var err by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("Family Locator", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))
        OutlinedTextField(name, { name = it }, label = { Text("Your name (sign up only)") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(pw, { pw = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth())
        if (err.isNotEmpty()) Text(err, color = Color.Red)
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button({ scope.launch {
                try { onDone(Repo.signIn(email.trim(), pw)) } catch (e: Exception) { err = e.message ?: "Error" }
            } }) { Text("Sign in") }
            OutlinedButton({ scope.launch {
                try { onDone(Repo.signUp(email.trim(), pw, name.ifBlank { "Me" })) } catch (e: Exception) { err = e.message ?: "Error" }
            } }) { Text("Sign up") }
        }
    }
}

@Composable
fun CircleScreen(onDone: (String) -> Unit) {
    var circleName by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var err by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("Create a circle", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(circleName, { circleName = it }, label = { Text("Circle name") }, modifier = Modifier.fillMaxWidth())
        Button({ scope.launch {
            try { onDone(Repo.createCircle(circleName.ifBlank { "Family" })) } catch (e: Exception) { err = e.message ?: "Error" }
        } }) { Text("Create") }
        Spacer(Modifier.height(32.dp))
        Text("Or join with an invite code", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(code, { code = it }, label = { Text("Invite code") }, modifier = Modifier.fillMaxWidth())
        Button({ scope.launch {
            try { if (Repo.joinCircle(code)) onDone(code.trim().uppercase()) else err = "Code not found" }
            catch (e: Exception) { err = e.message ?: "Error" }
        } }) { Text("Join") }
        if (err.isNotEmpty()) Text(err, color = Color.Red)
    }
}

fun ago(ts: Long): String {
    val m = (System.currentTimeMillis() - ts) / 60000
    return when { m < 1 -> "just now"; m < 60 -> "$m min ago"; else -> "${m / 60} h ago" }
}

fun hhmm(ts: Long): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))
fun dayMonth(ts: Long): String = SimpleDateFormat("d MMM HH:mm", Locale.getDefault()).format(Date(ts))

fun MapView.addPlaces(places: List<Place>) {
    places.forEach { p ->
        overlays.add(Polygon().apply {
            points = Polygon.pointsAsCircle(GeoPoint(p.lat, p.lng), p.radius)
            fillPaint.color = 0x2200AAFF
            outlinePaint.color = 0xFF0077CC.toInt()
            outlinePaint.strokeWidth = 3f
            title = p.name
        })
    }
}

@Composable
fun Home(circleId: String, onSignOut: () -> Unit) {
    var tab by remember { mutableStateOf(0) }
    var members by remember { mutableStateOf(listOf<Member>()) }
    var places by remember { mutableStateOf(listOf<Place>()) }
    var events by remember { mutableStateOf(listOf<Event>()) }
    var sharing by remember { mutableStateOf(false) }
    var sos by remember { mutableStateOf(false) }

    LaunchedEffect(circleId) {
        launch { Repo.members(circleId).collect { members = it } }
        launch { Repo.places(circleId).collect { places = it } }
        launch { Repo.events(circleId).collect { events = it } }
    }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Invite code: $circleId", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            TextButton(onSignOut) { Text("Sign out") }
        }
        TabRow(selectedTabIndex = tab) {
            listOf("Live", "Places", "History", "Alerts").forEachIndexed { i, t ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) })
            }
        }
        when (tab) {
            0 -> LiveTab(members, places, sharing, sos, { sharing = it }, { sos = it })
            1 -> PlacesTab(members, places)
            2 -> HistoryTab(members)
            else -> AlertsTab(events)
        }
    }
}

@Composable
fun LiveTab(
    members: List<Member>, places: List<Place>, sharing: Boolean, sos: Boolean,
    onSharing: (Boolean) -> Unit, onSos: (Boolean) -> Unit
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val centered = remember { booleanArrayOf(false) }

    fun start() {
        ContextCompat.startForegroundService(ctx, Intent(ctx, LocationService::class.java))
        onSharing(true)
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        if (it[Manifest.permission.ACCESS_FINE_LOCATION] == true) start()
    }

    Column(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { MapView(it).apply { setMultiTouchControls(true); controller.setZoom(15.0) } },
            modifier = Modifier.weight(1f).fillMaxWidth(),
            update = { map ->
                map.overlays.clear()
                map.addPlaces(places)
                members.forEach { m ->
                    map.overlays.add(Marker(map).apply {
                        position = GeoPoint(m.lat, m.lng)
                        title = (if (m.sos) "SOS! " else "") + m.name
                        snippet = ago(m.ts)
                    })
                }
                if (!centered[0] && members.isNotEmpty()) {
                    map.controller.setCenter(GeoPoint(members[0].lat, members[0].lng)); centered[0] = true
                }
                map.invalidate()
            }
        )
        LazyColumn(Modifier.height(110.dp).padding(horizontal = 12.dp)) {
            items(members) { m ->
                Text(
                    (if (m.sos) "SOS  " else "") + "${m.name} · ${ago(m.ts)}",
                    color = if (m.sos) Color.Red else Color.Unspecified,
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(modifier = Modifier.weight(1f), onClick = {
                if (sharing) {
                    ctx.stopService(Intent(ctx, LocationService::class.java)); onSharing(false)
                } else {
                    val perms = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                    if (Build.VERSION.SDK_INT >= 33) perms += Manifest.permission.POST_NOTIFICATIONS
                    launcher.launch(perms.toTypedArray())
                }
            }) { Text(if (sharing) "Stop sharing" else "Share my location") }
            Button(
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                onClick = { onSos(!sos); scope.launch { runCatching { Repo.setSos(!sos) } } }
            ) { Text(if (sos) "Cancel SOS" else "SOS") }
        }
    }
}

@Composable
fun PlacesTab(members: List<Member>, places: List<Place>) {
    var name by remember { mutableStateOf("") }
    var radius by remember { mutableStateOf("150") }
    val scope = rememberCoroutineScope()
    val holder = remember { arrayOfNulls<MapView>(1) }
    val centered = remember { booleanArrayOf(false) }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            AndroidView(
                factory = { MapView(it).apply { setMultiTouchControls(true); controller.setZoom(16.0); holder[0] = this } },
                modifier = Modifier.fillMaxSize(),
                update = { map ->
                    map.overlays.clear()
                    map.addPlaces(places)
                    if (!centered[0]) {
                        val first = members.firstOrNull()?.let { GeoPoint(it.lat, it.lng) }
                            ?: places.firstOrNull()?.let { GeoPoint(it.lat, it.lng) }
                        if (first != null) { map.controller.setCenter(first); centered[0] = true }
                    }
                    map.invalidate()
                }
            )
            Text("+", Modifier.align(Alignment.Center), style = MaterialTheme.typography.headlineLarge, color = Color.Red)
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(name, { name = it }, label = { Text("Place name") }, modifier = Modifier.weight(1f), singleLine = true)
            OutlinedTextField(
                radius, { radius = it }, label = { Text("Radius m") }, modifier = Modifier.width(100.dp),
                singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
        }
        Button(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            onClick = {
                val c = holder[0]?.mapCenter
                if (c != null) scope.launch {
                    runCatching { Repo.addPlace(name.ifBlank { "Place" }, c.latitude, c.longitude, radius.toDoubleOrNull() ?: 150.0) }
                    name = ""
                }
            }
        ) { Text("Add place at map center (+)") }
        LazyColumn(Modifier.height(110.dp).padding(horizontal = 12.dp)) {
            items(places) { p ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${p.name} · ${p.radius.toInt()} m", Modifier.weight(1f))
                    TextButton({ scope.launch { runCatching { Repo.deletePlace(p.id) } } }) { Text("Delete") }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryTab(members: List<Member>) {
    val utc = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") } }
    var selected by remember { mutableStateOf<String?>(null) }
    var day by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())) }
    var showPicker by remember { mutableStateOf(false) }
    var points by remember { mutableStateOf(listOf<HistoryPoint>()) }
    var loading by remember { mutableStateOf(false) }

    LaunchedEffect(members) { if (selected == null) selected = members.firstOrNull()?.uid }
    LaunchedEffect(selected, day) {
        val u = selected ?: return@LaunchedEffect
        loading = true
        points = runCatching { Repo.history(u, day) }.getOrDefault(emptyList())
        loading = false
    }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            members.forEach { m ->
                FilterChip(selected = selected == m.uid, onClick = { selected = m.uid }, label = { Text(m.name) })
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton({ showPicker = true }) { Text("Date: $day") }
            Text(if (loading) "Loading…" else if (points.isEmpty()) "No data for this day" else "${points.size} points · ${hhmm(points.first().ts)}–${hhmm(points.last().ts)}")
        }
        AndroidView(
            factory = { MapView(it).apply { setMultiTouchControls(true); controller.setZoom(15.0) } },
            modifier = Modifier.weight(1f).fillMaxWidth(),
            update = { map ->
                map.overlays.clear()
                if (points.isNotEmpty()) {
                    val geo = points.map { GeoPoint(it.lat, it.lng) }
                    if (geo.size >= 2) map.overlays.add(Polyline().apply {
                        setPoints(geo)
                        outlinePaint.color = 0xFF1E66F5.toInt()
                        outlinePaint.strokeWidth = 8f
                    })
                    map.overlays.add(Marker(map).apply { position = geo.first(); title = "Start ${hhmm(points.first().ts)}" })
                    if (geo.size >= 2) map.overlays.add(Marker(map).apply { position = geo.last(); title = "End ${hhmm(points.last().ts)}" })
                    map.post {
                        if (geo.size >= 2) map.zoomToBoundingBox(BoundingBox.fromGeoPoints(geo), true, 80)
                        else { map.controller.setZoom(17.0); map.controller.setCenter(geo.first()) }
                    }
                }
                map.invalidate()
            }
        )
    }

    if (showPicker) {
        val st = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton({
                    st.selectedDateMillis?.let { day = utc.format(Date(it)) }
                    showPicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton({ showPicker = false }) { Text("Cancel") } }
        ) { DatePicker(state = st) }
    }
}

@Composable
fun AlertsTab(events: List<Event>) {
    if (events.isEmpty()) {
        Box(Modifier.fillMaxSize(), Alignment.Center) { Text("No place alerts yet") }
    } else LazyColumn(Modifier.fillMaxSize().padding(12.dp)) {
        items(events) { e ->
            Text("${dayMonth(e.ts)} · ${e.text()}", Modifier.padding(vertical = 6.dp))
        }
    }
}

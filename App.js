import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Animated,
} from 'react-native';

import logo from './assets/Logo.png';

/* ---------------------------------------------------------
   Swipeable Result Row Component
--------------------------------------------------------- */
const SwipeableResultRow = ({ slotIndex, result, onDelete, canDelete }) => {
  const panX = useRef(new Animated.Value(0)).current;
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    if (!result || !canDelete) return;
    const pageX = e.nativeEvent.pageX || (e.nativeEvent.touches && e.nativeEvent.touches[0].pageX);
    const pageY = e.nativeEvent.pageY || (e.nativeEvent.touches && e.nativeEvent.touches[0].pageY);
    touchStartX.current = pageX;
    touchStartY.current = pageY;
  };

  const handleTouchMove = (e) => {
    if (!result || !canDelete) return;
    const pageX = e.nativeEvent.pageX || (e.nativeEvent.touches && e.nativeEvent.touches[0].pageX);
    const pageY = e.nativeEvent.pageY || (e.nativeEvent.touches && e.nativeEvent.touches[0].pageY);
    const dx = pageX - touchStartX.current;
    const dy = pageY - touchStartY.current;

    if (Math.abs(dx) > Math.abs(dy)) {
      panX.setValue(dx);
    }
  };

  const handleTouchEnd = (e) => {
    if (!result || !canDelete) return;
    const pageX = e.nativeEvent.changedTouches
      ? e.nativeEvent.changedTouches[0].pageX
      : e.nativeEvent.pageX;
    const dx = pageX - touchStartX.current;

    if (Math.abs(dx) > 60) {
      Animated.timing(panX, {
        toValue: dx > 0 ? 400 : -400,
        duration: 150,
        useNativeDriver: false,
      }).start(() => {
        onDelete(slotIndex);
        panX.setValue(0);
      });
    } else {
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  return (
    <Animated.View
      style={[
        styles.historyRowContainer,
        { transform: [{ translateX: panX }] },
      ]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Text style={[styles.historyPrefix, !result && styles.hiddenText]}>
        {slotIndex + 1}:{' '}
      </Text>
      <Text style={[styles.historyValue, !result && styles.hiddenText]}>
        {result ? result : ''}
      </Text>
    </Animated.View>
  );
};

/* ---------------------------------------------------------
   Helper Math & Prediction Functions
--------------------------------------------------------- */
function getDateNumber(customDate) {
  const dateStr = customDate
    ? customDate.padStart(6, '0')
    : String(new Date().getDate()).padStart(2, '0') +
      String(new Date().getMonth() + 1).padStart(2, '0') +
      String(new Date().getFullYear()).slice(-2);
  return parseInt(dateStr, 10);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isUgly(n) {
  const s = String(n);
  if (['10000', '20000', '30000', '40000', '50000', '99999'].includes(s))
    return true;
  if (['11111', '22222', '33333', '44444', '55555'].includes(s)) return true;
  if (s === '12345' || s === '54321') return true;
  if (s.endsWith('000') || s.endsWith('999')) return true;
  return false;
}

function randomFiltered(min, max, exclude) {
  let n = 0;
  let tries = 0;
  do {
    n = rand(min, max);
    tries++;
    if (tries > 2000) return null;
  } while (exclude.includes(n) || isUgly(n));
  return n;
}

function generateRows(dateNum) {
  let digits, minVal, maxVal;

  if (dateNum > 29997) {
    digits = 5;
    minVal = 9000;
    maxVal = 99999;
  } else {
    digits = 4;
    minVal = 2000;
    maxVal = 9999;
  }

  for (let attempt = 0; attempt < 1000; attempt++) {
    const rows = [];

    const r1 = randomFiltered(minVal, maxVal, []);
    if (!r1) continue;
    rows.push(r1);

    const r2 = randomFiltered(minVal, maxVal, rows);
    if (!r2) continue;
    rows.push(r2);

    const r3 = dateNum - r1 - r2;
    if (r3 < minVal || r3 > maxVal) continue;
    if (isUgly(r3) || rows.includes(r3)) continue;
    rows.push(r3);

    const r4 = randomFiltered(minVal, maxVal, rows);
    if (!r4) continue;
    rows.push(r4);

    const r5 = dateNum - r3 - r4;
    if (r5 < minVal || r5 > maxVal) continue;
    if (isUgly(r5) || rows.includes(r5)) continue;
    rows.push(r5);

    return rows.map((n) => String(n).padStart(digits, '0'));
  }

  return [
    String(minVal).padStart(digits, '0'),
    String(minVal).padStart(digits, '0'),
    String(minVal).padStart(digits, '0'),
    String(minVal).padStart(digits, '0'),
    String(minVal).padStart(digits, '0'),
  ];
}

export default function App() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [deletedSlots, setDeletedSlots] = useState([]);

  const [targetRows, setTargetRows] = useState([]);
  const [customDate, setCustomDate] = useState(null);
  const [inputDate, setInputDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [choiceVisible, setChoiceVisible] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    prepareTargetRows();
  }, [customDate]);

  const prepareTargetRows = () => {
    const dateNum = getDateNumber(customDate);
    const rows = generateRows(dateNum);
    setTargetRows(rows);
  };

  const isComplete = history.filter(Boolean).length >= 5;

  const startStopwatch = () => {
    if (isComplete && !isRunning) return;

    if (!isRunning) {
      setIsRunning(true);
      setShowResult(false);
      setTime(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      clearInterval(timerRef.current);
      const finalTimeMs = Date.now() - startTimeRef.current;
      setIsRunning(false);
      setShowResult(true);

      const realFullSeconds = Math.floor(finalTimeMs / 1000);

      const attemptIndex = history.length;
      let forcedSubseconds;

      if (attemptIndex < targetRows.length) {
        forcedSubseconds = targetRows[attemptIndex];
      } else {
        const fallbackDigits = targetRows[0] ? targetRows[0].length : 4;
        forcedSubseconds = String(Math.floor(finalTimeMs % 1000)).padStart(
          fallbackDigits,
          '0'
        );
      }

      const finalCombinedTime = `${realFullSeconds}.${forcedSubseconds}`;

      setHistory((prevHistory) => [...prevHistory, finalCombinedTime]);
    }
  };

  const restartStopwatch = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setShowResult(false);
    setTime(0);
    setHistory([]);
    setDeletedSlots([]);
    prepareTargetRows();
  };

  const handleDeleteResult = (indexToDelete) => {
    setHistory((prevHistory) => {
      const updated = [...prevHistory];
      updated[indexToDelete] = null;
      return updated;
    });
    setDeletedSlots((prev) => [...prev, indexToDelete]);
  };

  const handleSetDate = () => {
    if (inputDate.length === 6 && /^\d+$/.test(inputDate)) {
      setCustomDate(inputDate);
      setModalVisible(false);
    }
  };

  const digitCount = targetRows[0] ? targetRows[0].length : 4;
  const zeroPlaceholder = `00.${'0'.repeat(digitCount)}`;

  const activeResults = history.filter(Boolean);
  const currentDisplayTime =
    showResult && activeResults.length > 0
      ? activeResults[activeResults.length - 1]
      : zeroPlaceholder;

  const isRowDeletable = (slotIndex) => {
    if (slotIndex === 2) return false;

    const topDeleted = deletedSlots.includes(0) || deletedSlots.includes(1);
    const bottomDeleted = deletedSlots.includes(3) || deletedSlots.includes(4);

    if (topDeleted) {
      return slotIndex === 0 || slotIndex === 1;
    }

    if (bottomDeleted) {
      return slotIndex === 3 || slotIndex === 4;
    }

    return slotIndex === 0 || slotIndex === 1 || slotIndex === 3 || slotIndex === 4;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={logo}
          style={{
            width: 220,
            height: 150,
            resizeMode: 'contain',
            marginBottom: 4,
          }}
        />

        <TouchableOpacity
          onLongPress={() => setChoiceVisible(true)}
          delayLongPress={3000}
          activeOpacity={1}
        >
          <Text style={styles.titleText}>
            How precise are your instincts?
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.timerText}>{currentDisplayTime}</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.restartButton]}
            onPress={restartStopwatch}
          >
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isRunning ? styles.stopButton : styles.goButton,
              isComplete && !isRunning && styles.disabledButton,
            ]}
            onPress={startStopwatch}
            disabled={isComplete && !isRunning}
          >
            <Text style={styles.buttonText}>{isRunning ? 'Stop' : 'Go'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyContainer}>
          <Text style={styles.historyLabel}>Results:</Text>
          <ScrollView
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
          >
            {[0, 1, 2, 3, 4].map((slotIndex) => (
              <SwipeableResultRow
                key={slotIndex}
                slotIndex={slotIndex}
                result={history[slotIndex]}
                canDelete={isRowDeletable(slotIndex)}
                onDelete={handleDeleteResult}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <Modal transparent visible={choiceVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choose Date Mode</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setCustomDate(null);
                setChoiceVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>Use Today’s Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setChoiceVisible(false);
                setModalVisible(true);
              }}
            >
              <Text style={styles.modalButtonText}>Select Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#aaa' }]}
              onPress={() => setChoiceVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Date (DDMMYY)</Text>

            <TextInput
              style={styles.input}
              value={inputDate}
              onChangeText={setInputDate}
              keyboardType="numeric"
              maxLength={6}
              placeholder="DDMMYY"
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleSetDate}>
              <Text style={styles.modalButtonText}>Set Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#aaa' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    marginVertical: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  goButton: {
    backgroundColor: '#2e7d32',
  },
  stopButton: {
    backgroundColor: '#c62828',
  },
  restartButton: {
    backgroundColor: '#c62828',
  },
  disabledButton: {
    backgroundColor: '#444444',
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  historyContainer: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  historyLabel: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyList: {
    width: '100%',
  },
  historyRowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    height: 48,
    width: '100%',
  },
  historyPrefix: {
    color: '#FF8C00',
    fontSize: 38,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  historyValue: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  hiddenText: {
    opacity: 0,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: 300,
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#555',
    color: '#fff',
    padding: 10,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 15,
    borderRadius: 6,
  },
  modalButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
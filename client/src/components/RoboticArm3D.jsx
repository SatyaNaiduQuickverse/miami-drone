import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Segment lengths
const BASE_HEIGHT = 0.15;
const UPPER_ARM_LENGTH = 0.45;
const FOREARM_LENGTH = 0.35;
const WRIST_LENGTH = 0.12;
const GRIPPER_LENGTH = 0.15;

// Colors - Clean professional look
const COLORS = {
  platform: '#4a5568',        // Slate gray platform
  base: '#718096',            // Medium gray base
  joint: '#3182ce',           // Blue joints (all same)
  arm: '#ed8936',             // Orange arm segments (both same)
  wrist: '#4a5568',           // Slate gray wrist
  gripper: '#2d3748',         // Dark slate gripper
  gripperTip: '#48bb78',      // Green gripper tips
};

// Main robotic arm with proper kinematic chain
const RoboticArmModel = ({ joints, gripper, enabled }) => {
  // Convert degrees to radians
  const baseRad = THREE.MathUtils.degToRad(joints.base);
  const shoulderRad = THREE.MathUtils.degToRad(-joints.shoulder); // Negative for intuitive control
  const elbowRad = THREE.MathUtils.degToRad(joints.elbow);
  const wristRad = THREE.MathUtils.degToRad(joints.wrist);

  // Gripper: 0% = closed (fingers together), 100% = open (fingers apart)
  // Fingers are 0.07 apart, tips at 0.15 distance from pivot
  const gripperClose = ((100 - gripper) / 100) * 0.2;

  return (
    <group>
      {/* Ground platform */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.04, 32]} />
        <meshStandardMaterial color={COLORS.platform} metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Base - rotates around Y axis */}
      <group rotation={[0, baseRad, 0]}>
        {/* Base cylinder */}
        <mesh position={[0, BASE_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[0.12, 0.15, BASE_HEIGHT, 32]} />
          <meshStandardMaterial color={COLORS.base} metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Base top cap / shoulder joint */}
        <mesh position={[0, BASE_HEIGHT, 0]}>
          <sphereGeometry args={[0.1, 32, 32]} />
          <meshStandardMaterial color={COLORS.joint} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Shoulder - rotates around X axis at top of base */}
        <group position={[0, BASE_HEIGHT, 0]} rotation={[shoulderRad, 0, 0]}>
          {/* Upper arm */}
          <mesh position={[0, UPPER_ARM_LENGTH / 2, 0]}>
            <capsuleGeometry args={[0.06, UPPER_ARM_LENGTH - 0.12, 8, 16]} />
            <meshStandardMaterial color={COLORS.arm} metalness={0.15} roughness={0.65} />
          </mesh>

          {/* Elbow joint */}
          <mesh position={[0, UPPER_ARM_LENGTH, 0]}>
            <sphereGeometry args={[0.07, 32, 32]} />
            <meshStandardMaterial color={COLORS.joint} metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Elbow - rotates around X axis at end of upper arm */}
          <group position={[0, UPPER_ARM_LENGTH, 0]} rotation={[elbowRad, 0, 0]}>
            {/* Forearm */}
            <mesh position={[0, FOREARM_LENGTH / 2, 0]}>
              <capsuleGeometry args={[0.05, FOREARM_LENGTH - 0.1, 8, 16]} />
              <meshStandardMaterial color={COLORS.arm} metalness={0.15} roughness={0.65} />
            </mesh>

            {/* Wrist joint */}
            <mesh position={[0, FOREARM_LENGTH, 0]}>
              <sphereGeometry args={[0.055, 32, 32]} />
              <meshStandardMaterial color={COLORS.joint} metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Wrist - rotates around Y axis at end of forearm */}
            <group position={[0, FOREARM_LENGTH, 0]} rotation={[0, wristRad, 0]}>
              {/* Wrist segment */}
              <mesh position={[0, WRIST_LENGTH / 2, 0]}>
                <capsuleGeometry args={[0.04, WRIST_LENGTH - 0.06, 8, 16]} />
                <meshStandardMaterial color={COLORS.wrist} metalness={0.5} roughness={0.5} />
              </mesh>

              {/* Gripper base */}
              <group position={[0, WRIST_LENGTH, 0]}>
                <mesh>
                  <boxGeometry args={[0.12, 0.03, 0.06]} />
                  <meshStandardMaterial color={COLORS.gripper} metalness={0.5} roughness={0.5} />
                </mesh>

                {/* Left finger - rotates inward (CW = negative Z) when closed */}
                <group position={[-0.035, 0, 0]} rotation={[0, 0, -gripperClose]}>
                  <mesh position={[0, GRIPPER_LENGTH / 2, 0]}>
                    <boxGeometry args={[0.02, GRIPPER_LENGTH, 0.04]} />
                    <meshStandardMaterial color={COLORS.gripper} metalness={0.5} roughness={0.5} />
                  </mesh>
                  {/* Finger tip - centered on finger */}
                  <mesh position={[0, GRIPPER_LENGTH, 0]}>
                    <boxGeometry args={[0.025, 0.04, 0.035]} />
                    <meshStandardMaterial color={COLORS.gripperTip} metalness={0.6} roughness={0.4} />
                  </mesh>
                </group>

                {/* Right finger - rotates inward (CCW = positive Z) when closed */}
                <group position={[0.035, 0, 0]} rotation={[0, 0, gripperClose]}>
                  <mesh position={[0, GRIPPER_LENGTH / 2, 0]}>
                    <boxGeometry args={[0.02, GRIPPER_LENGTH, 0.04]} />
                    <meshStandardMaterial color={COLORS.gripper} metalness={0.5} roughness={0.5} />
                  </mesh>
                  {/* Finger tip - centered on finger */}
                  <mesh position={[0, GRIPPER_LENGTH, 0]}>
                    <boxGeometry args={[0.025, 0.04, 0.035]} />
                    <meshStandardMaterial color={COLORS.gripperTip} metalness={0.6} roughness={0.4} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// Lighting setup - clean studio lighting
const Lighting = () => {
  return (
    <>
      <ambientLight intensity={0.6} />
      {/* Key light */}
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow color="#ffffff" />
      {/* Fill light */}
      <directionalLight position={[-4, 5, -3]} intensity={0.5} color="#ffffff" />
      {/* Rim/back light */}
      <directionalLight position={[0, 3, -5]} intensity={0.6} color="#ffffff" />
      {/* Soft hemisphere */}
      <hemisphereLight args={['#ffffff', '#e2e8f0', 0.5]} />
    </>
  );
};

// Main component
const RoboticArm3D = ({ armState }) => {
  return (
    <div className="arm-3d-container">
      <Canvas shadows camera={{ position: [1.2, 0.6, 1.2], fov: 45 }}>
        <Lighting />
        <RoboticArmModel
          joints={armState.joints}
          gripper={armState.gripper}
          enabled={armState.enabled}
        />
        <OrbitControls
          enablePan={false}
          minDistance={0.8}
          maxDistance={3}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={[0, 0.3, 0]}
        />
        {/* Grid helper for reference */}
        <gridHelper args={[2, 16, '#a0aec0', '#cbd5e0']} position={[0, -0.02, 0]} />
      </Canvas>

      {/* Instructions */}
      <div className="arm-3d-hint">
        Drag to rotate
      </div>
    </div>
  );
};

export default RoboticArm3D;
